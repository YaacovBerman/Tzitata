import requests
import json
import re
import os
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILENAME = os.path.join(SCRIPT_DIR, 'quotesDB.json')

def load_existing_db():
    if os.path.exists(DB_FILENAME):
        try:
            with open(DB_FILENAME, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return []
    return []

def save_db(data):
    with open(DB_FILENAME, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

def calculate_difficulty(quote):
    # ניקוי ניקוד וסימנים לצורך חישוב אורך נקי
    clean_text = re.sub(r'[^א-ת]', '', quote)
    clean_length = len(clean_text)
    
    if clean_length < 45:
        base_diff = 3
    elif clean_length < 85:
        base_diff = 2
    else:
        base_diff = 1
        
    # בדיקת אותיות נדירות
    rare_letters = set(['ט', 'ז', 'צ', 'ס', 'ג', 'ק', 'פ', 'ח'])
    rare_count = sum(1 for char in quote if char in rare_letters)
    
    if clean_length > 0 and (rare_count / clean_length) > 0.15:
        base_diff += 1
        
    return min(3, max(1, base_diff))

def get_target_pages():
    # --- רשימות הדפים לפי בקשת המשתמש ---
    
    personalities = [
        'ש"י עגנון', 'סלבדור דאלי', 'שמעון פרס', 'אליזבת השנייה', 'מארי אנטואנט', 
        'מנחם בגין', 'רמב"ם', 'יונתן זקס', 'אלברט איינשטיין', 'זיגמונד פרויד', 
        'אחד העם', 'נחמן מברסלב', 
        'אדם סמית', 'פלוטארכוס', 'נתן אלתרמן', 
        'קונפוציוס', 'דונלד טראמפ', 'ויליאם שייקספיר', 'אוסקר ויילד', 'וינסטון צ\'רצ\'יל', 
        'מארק טוויין', 'פרידריך ניטשה', 'גראוצ\'ו מרקס', 'אפרים קישון', 'אברהם לינקולן', 'סוקרטס'
    ]

    return personalities 

def clean_wikitext(text):
    # הסרת תבניות {{...}}
    text = re.sub(r'\{\{[^}]+\}\}', '', text)
    # טיפול בקישורים [[...]]
    # [[link|text]] -> text
    text = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', r'\1', text)
    # הסרת הדגשות ''...''
    text = re.sub(r"''+", '', text)
    # הסרת תגיות HTML
    text = re.sub(r'<[^>]+>', '', text)
    return text.strip()

def fetch_quotes_from_pages():
    url = 'https://he.wikiquote.org/w/api.php'
    target_pages = get_target_pages()
    
    headers = {'User-Agent': 'CryptogramGameBot_JacobBerman/4.0'}
    valid_quotes = []
    
    # כדי למנוע כפילויות בתוך הריצה הנוכחית
    seen_in_session = set()

    print(f"מתחיל סריקה של {len(target_pages)} דפים...")

    # חלוקה למנות (batches) של 50 דפים כדי לייעל את הבקשות ל-API
    batch_size = 50
    for i in range(0, len(target_pages), batch_size):
        batch = target_pages[i:i+batch_size]
        titles_param = '|'.join(batch)
        
        params = {
            'action': 'query',
            'prop': 'revisions',
            'rvprop': 'content',
            'titles': titles_param,
            'format': 'json',
            'redirects': 1  # עוקב אחרי הפניות אם השם לא מדויק
        }

        try:
            response = requests.get(url, params=params, headers=headers)
            data = response.json()
            pages = data.get('query', {}).get('pages', {})

            for page_id, page in pages.items():
                title = page.get('title', 'Unknown')
                if 'missing' in page:
                    print(f"  - דף חסר: {title}")
                    continue
                
                if 'revisions' not in page:
                    continue

                wikitext = page['revisions'][0]['*']
                print(f"  > סורק את: {title}")

                for line in wikitext.split('\n'):
                    line = line.strip()
                    # חיפוש שורות שמתחילות בכוכבית (ציטוטים סטנדרטיים)
                    if line.startswith('*'):
                        raw_content = line[1:].strip()
                        
                        # דילוג על שורות שהן רק תמונה או קטגוריה
                        if raw_content.startswith('[[') and ('תמונה:' in raw_content or 'קובץ:' in raw_content):
                            continue
                            
                        clean_line = clean_wikitext(raw_content)
                        
                        # זיהוי ציטוט לפי מרכאות (הנחיה: כל ציטוט מתחיל ונגמר ב")
                        quote_match = re.search(r'"([^"]+)"', clean_line)
                        
                        if quote_match:
                            quote_text = quote_match.group(1).strip()
                        else:
                            # לוגיקה ישנה למקרה שאין מרכאות
                            split_match = re.search(r'(.*?)(\s[~–-]\s|\s~)(.*)$', clean_line)
                            quote_text = (split_match.group(1) if split_match else clean_line).strip().strip('"\'”„')
                        
                        author_text = title

                        # בדיקות תקינות
                        # 1. אורך סביר
                        # 2. מכיל עברית
                        # 3. לא מכיל תווים לטיניים (אנגלית) בתוך הציטוט עצמו (למעט שמות מחברים)
                        if 20 <= len(quote_text) <= 200:
                            if not re.search(r'[a-zA-Z]', quote_text): # רק עברית בציטוט
                                # בדיקה שזה לא סתם כותרת שנכנסה בטעות
                                if not quote_text.endswith(':'):
                                    
                                    # יצירת מפתח ייחודי למניעת כפילויות
                                    unique_key = f"{quote_text}_{author_text}"
                                    
                                    if unique_key not in seen_in_session:
                                        difficulty = calculate_difficulty(quote_text)
                                        valid_quotes.append({
                                            "quote": quote_text,
                                            "author": author_text,
                                            "difficulty": difficulty
                                        })
                                        seen_in_session.add(unique_key)

        except Exception as e:
            print(f"שגיאה בבקשת ה-API: {e}")
            time.sleep(1) # המתנה קצרה במקרה של שגיאה

        # עצירה אם הגענו לכמות גדולה מאוד (אופציונלי, כרגע שמתי גבול גבוה)
        if len(valid_quotes) >= 3000:
            print("הושג הגבול העליון של ציטוטים.")
            break

    return valid_quotes

def main():
    # טעינת המאגר הקיים (אם רוצים לשמור עליו) או התחלה מאפס
    # במקרה הזה, מכיוון שביקשת רשימה ספציפית מאוד, אולי עדיף לדרוס או להוסיף בזהירות.
    # הקוד כאן מוסיף למאגר הקיים רק אם הציטוט לא קיים.
    
    existing_data = load_existing_db()
    existing_quotes_set = set(q['quote'] for q in existing_data)
    
    print(f"במאגר הנוכחי יש {len(existing_data)} ציטוטים.")
    print("מתחיל בשאיבת הנתונים החדשים...")
    
    new_quotes = fetch_quotes_from_pages()
    
    added_count = 0
    for q in new_quotes:
        if q['quote'] not in existing_quotes_set:
            existing_data.append(q)
            existing_quotes_set.add(q['quote'])
            added_count += 1
            
    # ערבוב קל של המאגר (אופציונלי) או מיון
    existing_data.sort(key=lambda x: x['difficulty']) 

    save_db(existing_data)
    print(f"\n✅ המאגר עודכן (נוספו {added_count} ציטוטים חדשים, ובוצע ניקוי).")
    print(f"סה\"כ במאגר הסופי: {len(existing_data)}")

if __name__ == "__main__":
    main()
