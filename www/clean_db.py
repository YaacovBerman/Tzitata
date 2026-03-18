import json
import re
import unicodedata
import os
import random

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def remove_nikud(text):
    """פונקציה להסרת ניקוד ממחרוזת"""
    if not isinstance(text, str):
        return str(text)
    # מפרק את התווים לרכיבים (אות + ניקוד) ומסנן את הניקוד
    normalized = unicodedata.normalize('NFD', text)
    return "".join([c for c in normalized if unicodedata.category(c) != 'Mn'])

def is_valid_hebrew_quote(text):
    """בדיקה אם הציטוט הוא בעברית ותקין"""
    # חייב להכיל לפחות אות עברית אחת
    if not re.search(r'[\u0590-\u05FF]', text):
        return False
    
    # אסור שיכיל אותיות באנגלית, יוונית או קירילית
    if re.search(r'[a-zA-Z\u0370-\u04FF]', text):
        return False
        
    return True

def fix_punctuation(text):
    """הוספת רווחים אחרי סימני פיסוק (נקודה, פסיק, נקודתיים, שלוש נקודות)"""
    if not isinstance(text, str):
        return str(text)
    
    # רשימת תווים שאחריהם לא נוסיף רווח (כמו מרכאות סוגרות, סוגריים סוגרים וכו')
    closing_chars = r'"\'”’\)\]\}'
    
    # 1. טיפול בשלוש נקודות (או יותר)
    text = re.sub(r'(\.{2,})(?=[^\s\.' + closing_chars + r'])', r'\1 ', text)
    
    # 2. טיפול בנקודה בודדת
    # לא אחרי ספרה (סוף משפט רגיל)
    text = re.sub(r'(?<!\d)\.(?=[^\s\.' + closing_chars + r'])', '. ', text)
    # אחרי ספרה אך לא לפני ספרה (למשל "1. מילה")
    text = re.sub(r'(?<=\d)\.(?=[^\s\d\.' + closing_chars + r'])', '. ', text)

    # 3. טיפול בפסיק
    # לא אחרי ספרה
    text = re.sub(r'(?<!\d),(?=[^\s' + closing_chars + r'])', ', ', text)
    # אחרי ספרה אך לא לפני ספרה
    text = re.sub(r'(?<=\d),(?=[^\s\d' + closing_chars + r'])', ', ', text)

    # 4. טיפול בנקודתיים
    # לא אחרי ספרה
    text = re.sub(r'(?<!\d):(?=[^\s' + closing_chars + r'])', ': ', text)
    # אחרי ספרה אך לא לפני ספרה (כדי לא להרוס שעות כמו 12:00)
    text = re.sub(r'(?<=\d):(?=[^\s\d' + closing_chars + r'])', ': ', text)
    
    return text

def clean_file(filename):
    file_path = os.path.join(SCRIPT_DIR, filename)
    
    if not os.path.exists(file_path):
        print(f"הקובץ {file_path} לא נמצא.")
        return

    print(f"טוען את {file_path}...")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"שגיאה בטעינת הקובץ: {e}")
        return

    # טיפול במקרה של רשימה בתוך רשימה (כמו ב-superquotes.json)
    if data and isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
        print("  - זוהתה רשימה מקוננת, משטח אותה...")
        flat_data = []
        for item in data:
            if isinstance(item, list):
                flat_data.extend(item)
            else:
                flat_data.append(item)
        data = flat_data

    cleaned_data = []
    removed_count = 0
    nikud_removed_count = 0
    punctuation_fixed_count = 0
    length_removed_count = 0
    single_letter_removed_count = 0

    for item in data:
        quote = item.get('quote', '')
        author = item.get('author', '')
        
        # הסרת ניקוד
        nikud_clean_quote = remove_nikud(quote)
        nikud_clean_author = remove_nikud(author)

        # תיקון פיסוק (נקודה, פסיק, נקודתיים)
        clean_quote = fix_punctuation(nikud_clean_quote)
        clean_author = fix_punctuation(nikud_clean_author)

        # סינון לפי אורך ציטוט (35-140 תווים)
        if len(clean_quote) < 35 or len(clean_quote) > 140:
            length_removed_count += 1
            continue

        # סינון ציטוטים עם יותר מדי אותיות בודדות (יותר משליש מכמות המילים)
        words = clean_quote.split()
        word_count = len(words)
        
        final_to_regular = {'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ'}
        letter_counts = {}
        for char in clean_quote:
            if 'א' <= char <= 'ת':
                norm = final_to_regular.get(char, char)
                letter_counts[norm] = letter_counts.get(norm, 0) + 1
        
        single_occurrence_count = sum(1 for c in letter_counts.values() if c == 1)
        
        if word_count > 0 and single_occurrence_count > (word_count / 3):
            single_letter_removed_count += 1
            continue

        # בדיקה אם הוסר ניקוד (לצורך סטטיסטיקה)
        if nikud_clean_quote != quote:
            nikud_removed_count += 1
            
        # בדיקה אם תוקן פיסוק (לצורך סטטיסטיקה)
        if clean_quote != nikud_clean_quote or clean_author != nikud_clean_author:
            punctuation_fixed_count += 1
            
        # בדיקה אם הציטוט בעברית (בודקים רק את הציטוט, המחבר יכול להיות לועזי לפעמים)
        if is_valid_hebrew_quote(clean_quote):
            # עדכון הנתונים
            item['quote'] = clean_quote
            item['author'] = clean_author
            cleaned_data.append(item)
        else:
            removed_count += 1
            print(f"  - הוסר (לא עברית): {quote[:50]}...")

    # ערבוב הציטוטים
    random.shuffle(cleaned_data)

    # מספור מחדש
    for i, item in enumerate(cleaned_data):
        item['id'] = i + 1

    # שמירה חזרה לקובץ
    print(f"שומר את הנתונים המנוקים ל-{file_path}...")
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(cleaned_data, f, ensure_ascii=False, indent=4)

    print("-" * 30)
    print(f"סיכום ({filename}):")
    print(f"✅ נמחקו {removed_count} ציטוטים שאינם בעברית.")
    print(f"✅ נמחקו {length_removed_count} ציטוטים באורך לא מתאים.")
    print(f"✅ נמחקו {single_letter_removed_count} ציטוטים עם יותר מדי אותיות בודדות.")
    print(f"✅ הוסר ניקוד מ-{nikud_removed_count} ציטוטים.")
    print(f"✅ תוקן פיסוק ב-{punctuation_fixed_count} ציטוטים.")
    print(f"📊 סה\"כ ציטוטים במאגר החדש: {len(cleaned_data)}")

def main():
    files = ['quotesDB.json', 'superquotes.json']
    for f in files:
        clean_file(f)
        print()

if __name__ == "__main__":
    main()