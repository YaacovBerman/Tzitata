const hebrewFinalToRegular = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
const hebrewAlphabet = "קראטוןםפשדגכעיחלךףזסבהנמצתץ".split('');

const ICONS = {
    heart: `<svg viewBox="0 0 24 24" width="24" height="24" fill="var(--error-border)"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 17.5 3 20.58 3 23 5.42 23 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
    bulb: `<svg viewBox="0 0 24 24" width="24" height="24" fill="var(--hint-bg)"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6A4.997 4.997 0 0 1 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/></svg>`,
    home: `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`,
    help: `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/></svg>`
};

let currentQuoteData = null;
let allQuotes = [];
let superQuotes = [];
let superQuoteRanges = [];
let cipherMap = {};
let uniqueLettersGlobal = [];
let prefilledGlobalIndices = new Set();

let strikes = 0;
const MAX_STRIKES = 3;
let maxLevelReached = localStorage.getItem('cryptogramMaxLevel') ? parseInt(localStorage.getItem('cryptogramMaxLevel')) : 1;
let availableHints = localStorage.getItem('cryptogramHints') ? parseInt(localStorage.getItem('cryptogramHints')) : 3;
let futureHintUsed = false; // האם השתמשנו ברמז העתידי של השלב הזה להצלה
let currentLevelIndex = 0; // 0-based index
let totalCells = 0;
let correctCells = 0;
let isGameOver = false;
let isEndlessMode = false;
let lastFocusedInput = null;
let isHintMode = false;
let currentMapIndex = 0; // Index of the super-quote board being viewed

let currentTutorialStep = 1;
const totalTutorialSteps = 4;

// --- מערכת סטטיסטיקות והישגים ---
let userStats = {
    totalSolved: 0,
    perfectGames: 0,
    currentStreak: 0,
    maxStreak: 0,
    totalLetters: 0,
    unlockedBadges: []
};

const ACHIEVEMENT_CATEGORIES = [
    {
        id: 'solved',
        name: 'פותר החידות',
        desc: 'חידות שנפתרו',
        icon: '🧠',
        stat: 'totalSolved',
        levels: [1, 10, 50, 100, 250],
        titles: ['צעד ראשון', 'חובב', 'מנוסה', 'מומחה', 'מאסטר']
    },
    {
        id: 'perfect',
        name: 'עין נץ',
        desc: 'חידות ללא טעויות',
        icon: '✨',
        stat: 'perfectGames',
        levels: [1, 5, 20, 50, 100],
        titles: ['טירון', 'מדויק', 'חד עין', 'צלף', 'מושלם']
    },
    {
        id: 'streak',
        name: 'על הגל',
        desc: 'רצף ניצחונות (ללא פסילות)',
        icon: '🔥',
        stat: 'maxStreak',
        levels: [3, 10, 20, 50, 100],
        titles: ['מתחמם', 'לוהט', 'בלתי ניתן לעצירה', 'אגדי', 'אלמותי']
    },
    {
        id: 'letters',
        name: 'תולעת ספרים',
        desc: 'אותיות שנחשפו',
        icon: '📚',
        stat: 'totalLetters',
        levels: [100, 500, 2000, 5000, 10000],
        titles: ['קורא מתחיל', 'סקרן', 'תלמיד חכם', 'פרופסור', 'אנציקלופדיה']
    }
];

let toastQueue = [];
let isToastShowing = false;

function loadStats() {
    const saved = localStorage.getItem('cryptogramStats');
    if (saved) {
        userStats = { ...userStats, ...JSON.parse(saved) };
    }
}

function saveStats() {
    localStorage.setItem('cryptogramStats', JSON.stringify(userStats));
}

function checkAchievements() {
    let newlyUnlocked = false;
    ACHIEVEMENT_CATEGORIES.forEach(cat => {
        const statValue = userStats[cat.stat];
        cat.levels.forEach((threshold, index) => {
            const badgeId = `${cat.id}_${index + 1}`;
            if (statValue >= threshold && !userStats.unlockedBadges.includes(badgeId)) {
                userStats.unlockedBadges.push(badgeId);
                newlyUnlocked = true;
                toastQueue.push({
                    icon: cat.icon,
                    title: `הישג חדש: ${cat.name}!`,
                    subtitle: `רמה ${index + 1} - ${cat.titles[index]}`
                });
            }
        });
    });
    if (newlyUnlocked) {
        saveStats();
        processToastQueue();
    }
}

function processToastQueue() {
    if (isToastShowing || toastQueue.length === 0) return;
    isToastShowing = true;
    const badge = toastQueue.shift();
    
    let toast = document.getElementById('achievement-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'achievement-toast';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<div class="toast-icon">${badge.icon}</div><div style="flex:1;"><strong>${badge.title}</strong><br><span style="font-size: 0.9em">${badge.subtitle}</span></div>`;
    toast.className = 'show';
    
    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
        isToastShowing = false;
        setTimeout(processToastQueue, 600); // בדיקה אם יש עוד תגים בתור
    }, 4000);
}

function toggleModal(show) {
    const modal = document.getElementById('how-to-modal');
    modal.style.display = show ? 'flex' : 'none';
    if (show) {
        currentTutorialStep = 1;
        updateTutorialView();
    } else {
        // החזרת פוקוס עם סגירת החלונית
        if (!isGameOver && lastFocusedInput && !lastFocusedInput.classList.contains('correct') && !lastFocusedInput.classList.contains('revealed') && lastFocusedInput.offsetParent !== null) {
            try { 
                lastFocusedInput.focus({ preventScroll: true }); 
            } catch(e) { lastFocusedInput.focus(); }
        }
    }
}

function changeTutorialStep(step) {
    currentTutorialStep += step;
    if (currentTutorialStep < 1) currentTutorialStep = 1;
    if (currentTutorialStep > totalTutorialSteps) currentTutorialStep = totalTutorialSteps;
    updateTutorialView();
}

function updateTutorialView() {
    for (let i = 1; i <= totalTutorialSteps; i++) {
        const step = document.getElementById(`tutorial-step-${i}`);
        if (step) {
            step.classList.toggle('hidden', i !== currentTutorialStep);
        }
    }

    const prevBtn = document.getElementById('tut-prev-btn');
    const nextBtn = document.getElementById('tut-next-btn');

    if (prevBtn) prevBtn.style.visibility = currentTutorialStep === 1 ? 'hidden' : 'visible';

    if (nextBtn) {
        if (currentTutorialStep === totalTutorialSteps) {
            nextBtn.innerText = "הבנתי, בואו נתחיל!";
            nextBtn.onclick = () => toggleModal(false);
        } else {
            nextBtn.innerText = "הבא";
            nextBtn.onclick = () => changeTutorialStep(1);
        }
    }
}

function navigateMap(direction) {
    const newIndex = currentMapIndex + direction;

    // מצא את הלוח הכי רחוק שהמשתמש יכול לראות
    const maxReachedSqIndex = superQuoteRanges.findIndex(range => (maxLevelReached - 1) < range.end);
    const furthestAllowedIndex = maxReachedSqIndex === -1 ? superQuotes.length - 1 : maxReachedSqIndex;

    if (newIndex >= 0 && newIndex <= furthestAllowedIndex) {
        currentMapIndex = newIndex;
        renderMap();
    }
}

async function loadQuotes() {
    try {
        const quotesRes = await fetch('quotesDB.json');
        let superRes = null;
        try {
            superRes = await fetch('superquotes.json');
        } catch (e) {
            console.log('Superquotes not found or failed to load');
        }

        if (!quotesRes.ok) throw new Error("קובץ הנתונים לא נמצא");
        allQuotes = await quotesRes.json();

        if (superRes && superRes.ok) {
            superQuotes = await superRes.json();
            // חישוב טווחים לכל סופר-ציטוט
            let currentStart = 0;
            superQuoteRanges = superQuotes.map(sq => {
                let length = 0;
                for (let char of sq.quote) {
                    let clean = char.replace(/[\u0591-\u05C7]/g, '');
                    let norm = hebrewFinalToRegular[clean] || clean;
                    if (hebrewAlphabet.includes(norm)) length++;
                }
                let range = { start: currentStart, end: currentStart + length, length: length };
                currentStart += length;
                return range;
            });
        }

        // מיון הציטוטים מהקצר לארוך
        allQuotes.sort((a, b) => a.quote.length - b.quote.length);

    } catch (error) {
        console.error(error);
        allQuotes = [{
            quote: "החיים הם מה שקורה בזמן שאתה עסוק בלהכין תוכניות אחרות.",
            author: "ג'ון לנון"
        }];
    }
}

function backToMap() {
    document.getElementById('game-view').classList.add('hidden');
    const mapView = document.getElementById('map-view');
    mapView.classList.remove('hidden');

    mapView.classList.remove('fade-in');
    void mapView.offsetWidth; // trigger reflow
    mapView.classList.add('fade-in');

    // Reset map to current progress to avoid confusion
    let currentLevelIdx = maxLevelReached - 1;
    currentMapIndex = superQuoteRanges.findIndex(range => currentLevelIdx < range.end);
    if (currentMapIndex === -1) {
        currentMapIndex = superQuotes.length > 0 ? superQuotes.length - 1 : 0;
    }

    renderMap();
    history.replaceState({ level: undefined }, "", window.location.pathname);
}

function updateStrikesDisplay(animate = false) {
    const display = document.getElementById('mobile-strikes-display');
    const box = document.getElementById('mobile-strikes-box');

    if (display && box) {
        if (isEndlessMode) {
            display.innerText = "ללא הגבלה";
            box.style.borderColor = "var(--hint-bg)";
        } else {
            display.innerText = Math.max(0, MAX_STRIKES - strikes);
            box.style.borderColor = strikes === 0 ? "var(--tile-border)" : "var(--error-border)";
        }

        if (animate) {
            box.classList.remove('strike-anim');
            void box.offsetWidth; // trigger reflow
            box.classList.add('strike-anim');
        }
    }
}

function updateHintButton(animate = false) {
    const parentBtn = document.getElementById('mobile-hint-btn');
    if (parentBtn) {
        parentBtn.innerHTML = `${ICONS.bulb} <span>${availableHints}</span>`;
        if (animate) {
            parentBtn.classList.remove('pop-anim');
            void parentBtn.offsetWidth;
            parentBtn.classList.add('pop-anim');
        }
    }
}

function applyHint(targetInput) {
    if (!targetInput || targetInput.classList.contains('correct') || targetInput.classList.contains('revealed')) return;

    // Exit hint mode
    isHintMode = false;
    document.getElementById('game-board').classList.remove('hint-mode');
    document.querySelectorAll('.header-icon-btn').forEach(btn => btn.classList.remove('active'));

    // חשיפת התא הספציפי הזה בלבד
    targetInput.value = targetInput.dataset.displayChar;
    targetInput.classList.add('correct', 'prefilled');
    targetInput.readOnly = true;
    targetInput.tabIndex = -1;
    targetInput.parentElement.classList.add('is-correct');
    correctCells++;

    checkLetterCompletion(targetInput.dataset.original);

    availableHints--;
    localStorage.setItem('cryptogramHints', availableHints);

    updateHintButton(true);
    updateKeyboardState();
    saveGameState();

    if (correctCells === totalCells) { 
        winGame(); 
    } else {
        const allInputs = Array.from(document.querySelectorAll('.crypto-input'));
        const currentIndex = allInputs.indexOf(targetInput);
        let nextInput = null;

        for (let i = currentIndex + 1; i < allInputs.length; i++) {
            if (!allInputs[i].classList.contains('correct') && !allInputs[i].classList.contains('revealed')) {
                nextInput = allInputs[i];
                break;
            }
        }
        if (!nextInput) {
            for (let i = 0; i < currentIndex; i++) {
                if (!allInputs[i].classList.contains('correct') && !allInputs[i].classList.contains('revealed')) {
                    nextInput = allInputs[i];
                    break;
                }
            }
        }
        if (nextInput) {
            nextInput.focus();
            lastFocusedInput = nextInput;
        }
    }
}

function giveHint() {
    if (isGameOver) return;

    const hintBtn = document.getElementById('mobile-hint-btn');

    if (availableHints <= 0) {
        if (hintBtn) {
            hintBtn.classList.add('shake');
            setTimeout(() => hintBtn.classList.remove('shake'), 400);
        }
        return;
    }

    isHintMode = !isHintMode;
    const board = document.getElementById('game-board');

    if (isHintMode) {
        board.classList.add('hint-mode');
        if (hintBtn) hintBtn.classList.add('active');
    } else {
        board.classList.remove('hint-mode');
        if (hintBtn) hintBtn.classList.remove('active');
    }
}
function generateCipherAndHints(quote) {
    cipherMap = {};
    prefilledGlobalIndices = new Set();
    let positionsMap = {};

    for (let i = 0; i < quote.length; i++) {
        let cleanChar = quote[i].replace(/[\u0591-\u05C7]/g, '');
        let normChar = hebrewFinalToRegular[cleanChar] || cleanChar;

        if (/^[א-ת]$/.test(normChar)) {
            if (!positionsMap[normChar]) positionsMap[normChar] = [];
            positionsMap[normChar].push(i);
        }
    }

    uniqueLettersGlobal = Object.keys(positionsMap);
    let numbers = Array.from({ length: uniqueLettersGlobal.length }, (_, i) => i + 1);
    numbers.sort(() => Math.random() - 0.5);
    uniqueLettersGlobal.forEach((letter, index) => {
        cipherMap[letter] = numbers[index];
    });

    // --- האלגוריתם החדש לבחירת הרמזים --- //

    // 1. חישוב השכיחות של כל אות בציטוט הספציפי
    let letterFreq = [];
    uniqueLettersGlobal.forEach(letter => {
        letterFreq.push({ letter: letter, count: positionsMap[letter].length });
    });

    // סינון: רק אותיות שמופיעות יותר מפעם אחת
    letterFreq = letterFreq.filter(item => item.count > 1);

    // מיון לפי כמות ההופעות (מהנפוץ לנדיר)
    letterFreq.sort((a, b) => b.count - a.count);

    // 2. קביעת כמות הרמזים (בין 6 ל-8)
    // סופרים כמה אותיות עבריות יש בציטוט (מתעלמים מרווחים וסימני פיסוק)
    let cleanQuoteLength = quote.replace(/[^א-ת]/g, '').length;
    let numHints;

    if (cleanQuoteLength <= 45) {
        numHints = 6;      // ציטוט קצר
    } else if (cleanQuoteLength <= 75) {
        numHints = 7;      // ציטוט בינוני
    } else {
        numHints = 8;      // ציטוט ארוך
    }

    // מוודא למקרה קצה שלא נבקש יותר רמזים מסך האותיות הייחודיות שיש במשפט
    numHints = Math.min(numHints, uniqueLettersGlobal.length);

    let chosenHintLetters = [];

    // 3. חלוקה לקבוצות ובחירה מעורבת
    if (letterFreq.length >= 4) {
        let midIndex = Math.ceil(letterFreq.length / 2);
        let highFreqGroup = letterFreq.slice(0, midIndex);
        let medFreqGroup = letterFreq.slice(midIndex);

        // ערבוב פנימי של הקבוצות כדי שלא תמיד ניקח את האות הכי נפוצה שיש
        highFreqGroup.sort(() => Math.random() - 0.5);
        medFreqGroup.sort(() => Math.random() - 0.5);

        // ניקח בערך חצי מהקבוצה הנפוצה וחצי מהקבוצה הבינונית
        let highToPick = Math.ceil(numHints / 2);
        let medToPick = numHints - highToPick;

        let selectedHigh = highFreqGroup.slice(0, highToPick);
        let selectedMed = medFreqGroup.slice(0, medToPick);

        chosenHintLetters = [...selectedHigh.map(i => i.letter), ...selectedMed.map(i => i.letter)];

        // במקרה קצה שהיה חסר משהו בחלוקה
        let remainingLetters = letterFreq.map(i => i.letter).filter(l => !chosenHintLetters.includes(l));
        remainingLetters.sort(() => Math.random() - 0.5);
        while (chosenHintLetters.length < numHints && remainingLetters.length > 0) {
            chosenHintLetters.push(remainingLetters.pop());
        }
    } else {
        let shuffled = [...letterFreq].sort(() => Math.random() - 0.5);
        chosenHintLetters = shuffled.slice(0, numHints).map(i => i.letter);
    }

    // 4. חשיפה של הופעה אקראית אחת בלבד לכל אות רמז שנבחרה
    chosenHintLetters.forEach(letter => {
        let positions = positionsMap[letter];
        let randomPos = positions[Math.floor(Math.random() * positions.length)];
        prefilledGlobalIndices.add(randomPos);
    });
}

function renderBoard(quote) {
    const board = document.getElementById('game-board');
    board.innerHTML = '';
    totalCells = 0;
    correctCells = 0;

    const words = quote.split(' ');
    let globalIndex = 0;

    words.forEach(word => {
        const wordDiv = document.createElement('div');
        wordDiv.className = 'word';

        for (let i = 0; i < word.length; i++) {
            let originalChar = word[i];
            let trueChar = originalChar.replace(/[\u0591-\u05C7]/g, '');
            let normChar = hebrewFinalToRegular[trueChar] || trueChar;

            if (/^[א-ת]$/.test(normChar)) {
                totalCells++;
                let cipherNum = cipherMap[normChar];
                let isPrefilled = prefilledGlobalIndices.has(globalIndex);

                let cellContainer = document.createElement('div');
                cellContainer.className = 'cell-container';

                let input = document.createElement('input');
                input.type = 'text';
                input.maxLength = 1;
                input.className = 'crypto-input';
                input.setAttribute('inputmode', 'none');
                input.readOnly = true; // חוסם מקלדת אנדרואיד באופן מוחלט
                input.dataset.cipher = cipherNum;
                input.dataset.original = normChar;
                input.dataset.displayChar = trueChar;

                if (isPrefilled) {
                    input.value = trueChar;
                    input.readOnly = true;
                    input.tabIndex = -1;
                    input.classList.add('prefilled', 'correct');
                    cellContainer.classList.add('is-correct');
                    if (trueChar === 'י') {
                        cellContainer.classList.add('has-yod');
                    }
                    correctCells++;
                } else {
                    input.addEventListener('input', (e) => handleInput(e, normChar, input));
                    input.addEventListener('keydown', handleKeyDown);
                    input.addEventListener('click', () => {
                        if (isHintMode) {
                            applyHint(input);
                        } else if (!input.classList.contains('correct') && !input.classList.contains('revealed') && !isGameOver) {
                            input.focus();
                        }
                    });

                    // מנגנון חכם למניעת אובדן פוקוס
                    input.addEventListener('blur', (e) => {
                        if (isGameOver) return;
                        
                        // אם חלונית פתוחה, נאפשר לפוקוס להשתחרר
                        const isAnyModalOpen = Array.from(document.querySelectorAll('.modal')).some(m => m.style.display === 'flex');
                        if (isAnyModalOpen) return;

                        // מאפשר מעבר פוקוס רק לתא חוקי אחר
                        if (e.relatedTarget && e.relatedTarget.classList.contains('crypto-input') &&
                            !e.relatedTarget.classList.contains('correct') &&
                            !e.relatedTarget.classList.contains('revealed')) {
                            return;
                        }

                        // בכל מצב אחר מחזירים את הפוקוס בשבריר שניה לתא שלנו
                        setTimeout(() => {
                            if (lastFocusedInput === input && !input.classList.contains('correct') && !input.classList.contains('revealed') && input.offsetParent !== null) {
                                try { input.focus({ preventScroll: true }); } catch (err) { input.focus(); }
                            }
                        }, 50);
                    });
                }

                input.addEventListener('focus', (e) => {
                    if (e.target.classList.contains('correct') || e.target.classList.contains('revealed')) {
                        e.target.blur();
                    } else {
                        lastFocusedInput = e.target;
                    }
                });

                let numberLabel = document.createElement('div');
                numberLabel.className = 'cipher-number';
                numberLabel.innerText = cipherNum;

                cellContainer.appendChild(input);
                cellContainer.appendChild(numberLabel);
                wordDiv.appendChild(cellContainer);
            } else {
                let punctDiv = document.createElement('div');
                punctDiv.className = 'punctuation';
                punctDiv.innerText = originalChar;
                wordDiv.appendChild(punctDiv);
            }
            globalIndex++;
        }
        board.appendChild(wordDiv);
        globalIndex++;
    });

    uniqueLettersGlobal.forEach(letter => checkLetterCompletion(letter));
}

function handleKeyDown(event) {
    if (isGameOver) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const step = event.key === 'ArrowLeft' ? 1 : -1;
        moveFocus(step);
    } else if (/^[א-ת]$/.test(event.key)) {
        // תמיכה בהקלדה במקלדת פיזית גם כשהשדה readOnly
        if (lastFocusedInput && !lastFocusedInput.classList.contains('correct') && !lastFocusedInput.classList.contains('revealed')) {
            lastFocusedInput.value = event.key;
            const normChar = lastFocusedInput.dataset.original;
            handleInput({ target: lastFocusedInput }, normChar, lastFocusedInput);
        }
    }
}

function moveFocus(step) {
    const allInputs = Array.from(document.querySelectorAll('.crypto-input'));
    if (allInputs.length === 0) return;

    let currentIndex = lastFocusedInput ? allInputs.indexOf(lastFocusedInput) : -1;
    if (currentIndex === -1) {
        currentIndex = step > 0 ? -1 : allInputs.length;
    }

    let nextIndex = currentIndex + step;
    let loopCount = 0;

    while (loopCount < allInputs.length) {
        if (nextIndex >= allInputs.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = allInputs.length - 1;

        if (!allInputs[nextIndex].classList.contains('correct') && !allInputs[nextIndex].classList.contains('revealed')) {
            allInputs[nextIndex].focus();
            return;
        }
        nextIndex += step;
        loopCount++;
    }
}

function renderKeyboard() {
    const keyboard = document.getElementById('virtual-keyboard');
    keyboard.innerHTML = '';

    const rows = [
        "קראטופ",
        "שדגכעיחל",
        "זסבהנמצת"
    ];

    rows.forEach((rowStr, index) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';

        // הוספת חץ שמאלה (הבא) בתחילת השורה הראשונה
        if (index === 0) {
            const btnLeft = document.createElement('button');
            btnLeft.className = 'key-btn key-nav';
            btnLeft.innerText = '❮';
            btnLeft.onclick = () => moveFocus(1);
            rowDiv.appendChild(btnLeft);
        }

        rowStr.split('').forEach(letter => {
            let btn = document.createElement('button');
            btn.className = 'key-btn';
            btn.id = 'key-' + letter;
            btn.innerText = letter;
            btn.onclick = () => handleVirtualKey(letter);
            rowDiv.appendChild(btn);
        });

        // הוספת חץ ימינה (הקודם) בסוף השורה הראשונה
        if (index === 0) {
            const btnRight = document.createElement('button');
            btnRight.className = 'key-btn key-nav';
            btnRight.innerText = '❯';
            btnRight.onclick = () => moveFocus(-1);
            rowDiv.appendChild(btnRight);
        }

        keyboard.appendChild(rowDiv);
    });
}

function handleVirtualKey(letter) {
    if (isGameOver) return;

    // אם אין פוקוס, ננסה לפקס את התא הפנוי הראשון
    if (!lastFocusedInput || lastFocusedInput.classList.contains('correct') || lastFocusedInput.classList.contains('revealed') || lastFocusedInput.classList.contains('wrong')) {
        const firstEmpty = document.querySelector('.crypto-input:not(.correct):not(.revealed):not(.wrong)');
        if (firstEmpty) {
            lastFocusedInput = firstEmpty;
            lastFocusedInput.focus();
        } else {
            return;
        }
    }

    lastFocusedInput.value = letter;
    // הפעלת הלוגיקה של בדיקת הקלט
    const normChar = lastFocusedInput.dataset.original;
    handleInput({ target: lastFocusedInput }, normChar, lastFocusedInput);
}

function updateKeyboardState() {
    if (!currentQuoteData) return;

    // ספירת הופעות בציטוט המקורי
    const solutionCounts = {};
    for (let char of currentQuoteData.quote) {
        let clean = char.replace(/[\u0591-\u05C7]/g, '');
        let norm = hebrewFinalToRegular[clean] || clean;
        if (/^[א-ת]$/.test(norm)) {
            solutionCounts[norm] = (solutionCounts[norm] || 0) + 1;
        }
    }

    // ספירת הופעות שנפתרו נכון בלוח
    const correctCounts = {};
    document.querySelectorAll('.crypto-input.correct').forEach(input => {
        let norm = input.dataset.original;
        correctCounts[norm] = (correctCounts[norm] || 0) + 1;
    });

    // עדכון הכפתורים
    hebrewAlphabet.forEach(letter => {
        const btn = document.getElementById('key-' + letter);
        if (!btn) return;

        btn.className = 'key-btn'; // איפוס מחלקות
        btn.disabled = false; // איפוס לחיצות למקרה שמתחילים שלב חדש

        // נרמול האות (למשל ם->מ) כדי לבדוק מול הנתונים שנשמרו בצורה מנורמלת
        let norm = hebrewFinalToRegular[letter] || letter;

        const total = solutionCounts[norm] || 0;
        const found = correctCounts[norm] || 0;

        if (total > 0) {
            if (found >= total) {
                btn.classList.add('completed');
                btn.disabled = true; // נטרול הלחיצה על אותיות שהושלמו
            } else if (found > 0) {
                btn.classList.add('partial');
            }
        }
    });
}

function checkLetterCompletion(originalChar) {
    const inputs = document.querySelectorAll(`.crypto-input[data-original="${originalChar}"]`);
    if (inputs.length === 0) return;

    let allCorrect = Array.from(inputs).every(input => input.classList.contains('correct'));

    if (allCorrect) {
        inputs.forEach(input => {
            let numberLabel = input.nextElementSibling;
            if (numberLabel && numberLabel.classList.contains('cipher-number')) {
                numberLabel.classList.add('fade-out');
            }
            // בוטל: הסתרת הקו התחתון לאותיות שהושלמו
        });
    }
    // עדכון המקלדת מתבצע בנפרד ב-updateKeyboardState
}

function handleInput(event, normChar, inputElement) {
    if (isGameOver || inputElement.classList.contains('correct') || inputElement.classList.contains('revealed') || inputElement.classList.contains('wrong')) return;

    let val = event.target.value;
    if (!val) return;

    let cleanVal = val.replace(/[\u0591-\u05C7]/g, '');
    let normalizedVal = hebrewFinalToRegular[cleanVal] || cleanVal;

    if (!/^[א-ת]$/.test(normalizedVal)) {
        event.target.value = "";
        return;
    }

    if (normalizedVal === 'י') {
        inputElement.parentElement.classList.add('has-yod');
    } else {
        inputElement.parentElement.classList.remove('has-yod');
    }

    if (normalizedVal === normChar) {
        inputElement.classList.add('correct');
        inputElement.readOnly = true;
        inputElement.tabIndex = -1;
        inputElement.parentElement.classList.add('is-correct');
        inputElement.value = inputElement.dataset.displayChar;
        correctCells++;

        checkLetterCompletion(normChar);
        updateKeyboardState();

        if (correctCells === totalCells) {
            winGame();
        } else {
            const allInputs = Array.from(document.querySelectorAll('.crypto-input'));
            const currentIndex = allInputs.indexOf(inputElement);
            let nextInput = null;

            for (let i = currentIndex + 1; i < allInputs.length; i++) {
                if (!allInputs[i].classList.contains('correct') && !allInputs[i].classList.contains('revealed')) {
                    nextInput = allInputs[i];
                    break;
                }
            }
            if (!nextInput) {
                for (let i = 0; i < currentIndex; i++) {
                    if (!allInputs[i].classList.contains('correct') && !allInputs[i].classList.contains('revealed')) {
                        nextInput = allInputs[i];
                        break;
                    }
                }
            }
            if (nextInput) nextInput.focus();
        }
    } else {
        // אנימציה של טעות
        inputElement.classList.add('wrong');
        setTimeout(() => {
            inputElement.classList.remove('wrong');
            inputElement.value = "";
            inputElement.parentElement.classList.remove('has-yod');
            const isAnyModalOpen = Array.from(document.querySelectorAll('.modal')).some(m => m.style.display === 'flex');
            if (!isAnyModalOpen) {
                try { inputElement.focus({ preventScroll: true }); } catch(e) { inputElement.focus(); }
            }
        }, 500);

        strikes++;
        updateStrikesDisplay(true);
        // אין צורך לעדכן מקלדת בטעות כי שום דבר לא השתנה בסטטוס האותיות

        if (!isEndlessMode && strikes > MAX_STRIKES) {
            showGameOverModal();
        }
    }
    saveGameState();
}

function winGame() {
    isGameOver = true;
    clearSavedGame(currentLevelIndex);

    // --- עדכון סטטיסטיקות אישיות ---
    if (!isEndlessMode) {
        userStats.totalSolved++;
        if (strikes === 0) userStats.perfectGames++;
        userStats.currentStreak++;
        if (userStats.currentStreak > userStats.maxStreak) {
            userStats.maxStreak = userStats.currentStreak;
        }
        userStats.totalLetters += totalCells;
        checkAchievements();
        saveStats();
    }

    // בדיקה אם סיימנו סופר-ציטוט
    let currentLevelIdx = currentLevelIndex; // 0-based
    let activeSQIndex = superQuoteRanges.findIndex(range => currentLevelIdx >= range.start && currentLevelIdx < range.end);
    let isEndOfSuperQuote = false;

    if (activeSQIndex !== -1) {
        if (currentLevelIdx === superQuoteRanges[activeSQIndex].end - 1) {
            isEndOfSuperQuote = true;
        }
    }

    if (isEndOfSuperQuote) {
        showWinModal(false, true, activeSQIndex);
    } else {
        showWinModal();
    }

    // הוספת רמז אם לא השתמשנו ברמז העתידי להצלה
    if (!futureHintUsed) {
        availableHints++;
        localStorage.setItem('cryptogramHints', availableHints);
        updateHintButton(true);
    }

    // עדכון התקדמות
    if (currentLevelIndex + 1 >= maxLevelReached) {
        maxLevelReached++;
        localStorage.setItem('cryptogramMaxLevel', maxLevelReached);
    }
}

function showWinModal(isReplay = false, isSuperWin = false, superWinIndex = -1) {
    const winModal = document.getElementById('win-modal');
    const content = winModal.querySelector('.modal-content');
    let displayQuote = currentQuoteData.quote.trim();
    if (displayQuote.endsWith('.')) {
        displayQuote = displayQuote.slice(0, -1);
    }
    document.getElementById('win-quote').innerText = '"' + displayQuote + '"';
    document.getElementById('win-author').innerText = currentQuoteData.author;

    const title = winModal.querySelector('h2');
    
    // איפוס עיצובים קודמים
    content.classList.remove('celebration-modal');
    title.style.color = '';

    if (isReplay) {
        title.innerText = 'שלב ' + (currentLevelIndex + 1);
    } else {
        title.innerText = '🎉 כל הכבוד! 🎉';
        title.style.color = 'var(--success-text)';
        content.classList.add('celebration-modal');
    }
    title.style.display = 'block';

    // טיפול בכפתורים
    let replayBtns = document.getElementById('replay-buttons');

    // זיהוי כפתור "השלב הבא" הקיים ב-HTML
    let actionBtn = content.querySelector('button[onclick="nextLevel()"]');
    if (!actionBtn) {
        const candidates = content.querySelectorAll('button.btn-new');
        for (let btn of candidates) {
            if (!btn.closest('#replay-buttons')) {
                actionBtn = btn;
                break;
            }
        }
    }

    if (isReplay) {
        if (actionBtn) actionBtn.style.display = 'none';

        // בניה מחדש של הכפתורים כדי לוודא שהלוגיקה נכונה (ביטול סוגר חלונית בלבד)
        if (replayBtns) replayBtns.remove();
        
        replayBtns = document.createElement('div');
        replayBtns.id = 'replay-buttons';
        replayBtns.style.display = 'flex';
        replayBtns.style.gap = '15px';
        replayBtns.style.justifyContent = 'center';
        replayBtns.style.marginTop = '20px';

        const cancelBtn = document.createElement('button');
        cancelBtn.innerText = 'ביטול';
        cancelBtn.className = 'btn-new';
        cancelBtn.style.backgroundColor = 'var(--text-muted)';
        cancelBtn.onclick = () => {
            winModal.style.display = 'none';
            if (!isGameOver && lastFocusedInput && !lastFocusedInput.classList.contains('correct') && !lastFocusedInput.classList.contains('revealed') && lastFocusedInput.offsetParent !== null) {
                try { 
                    lastFocusedInput.focus({ preventScroll: true }); 
                } catch(e) { lastFocusedInput.focus(); }
            }
        };

        const againBtn = document.createElement('button');
        againBtn.innerText = 'עשה שוב';
        againBtn.className = 'btn-new';
        againBtn.onclick = () => {
            winModal.style.display = 'none';
            startLevel(currentLevelIndex, false, true);
        };

        replayBtns.appendChild(cancelBtn);
        replayBtns.appendChild(againBtn);
        content.appendChild(replayBtns);
    } else {
        if (replayBtns) replayBtns.style.display = 'none';
        
        if (actionBtn) {
            actionBtn.style.display = 'inline-block';
            if (isSuperWin) {
                actionBtn.innerText = "וזה לא הכל...";
                actionBtn.onclick = () => {
                    winModal.style.display = 'none';
                    showSuperWinModal(superWinIndex);
                };
            } else {
                actionBtn.innerText = "השלב הבא";
                actionBtn.onclick = nextLevel;
            }
        }
    }

    winModal.style.display = 'flex';
}

function showSuperWinModal(sqIndex) {
    const sq = superQuotes[sqIndex];
    const modal = document.getElementById('super-win-modal');
    let displayQuote = sq.quote.trim();
    if (displayQuote.endsWith('.')) {
        displayQuote = displayQuote.slice(0, -1);
    }
    document.getElementById('super-win-quote').innerText = '"' + displayQuote + '"';
    document.getElementById('super-win-author').innerText = sq.author;
    modal.style.display = 'flex';
}

function showGameOverModal() {
    // לא קובעים isGameOver=true עדיין כדי לאפשר חזרה
    const modal = document.getElementById('game-over-modal');
    const reviveBtn = document.getElementById('revive-btn');
    const practiceBtn = document.getElementById('practice-btn');

    // איפוס תצוגה
    reviveBtn.style.display = 'none';
    practiceBtn.style.display = 'none';

    // לוגיקה לכפתור ההצלה
    const canRevive = (availableHints > 0) || (!futureHintUsed);

    if (canRevive) {
        reviveBtn.innerText = `המשך מאותה נקודה תמורת 💡`;
        reviveBtn.disabled = false;
        reviveBtn.style.opacity = "1";
        reviveBtn.style.display = 'block';
    } else {
        // רק אם אין רמזים ואין רמז עתידי - מציגים את מצב האימון
        practiceBtn.style.display = 'block';
    }

    modal.style.display = 'flex';
}

function reviveGame() {
    if (availableHints > 0) {
        availableHints--;
        localStorage.setItem('cryptogramHints', availableHints);
    } else {
        futureHintUsed = true;
    }

    strikes--; // מחיקת פסילה
    updateStrikesDisplay();
    updateHintButton(true);
    document.getElementById('game-over-modal').style.display = 'none';

    // החזרת הפוקוס לאות האחרונה שניסו להקליד בה
    if (lastFocusedInput && !lastFocusedInput.classList.contains('correct') && !lastFocusedInput.classList.contains('revealed')) {
        try { lastFocusedInput.focus({ preventScroll: true }); } catch(e) { lastFocusedInput.focus(); }
    } else {
        const firstEmpty = document.querySelector('.crypto-input:not(.correct):not(.revealed)');
        if (firstEmpty) {
            lastFocusedInput = firstEmpty;
            try { firstEmpty.focus({ preventScroll: true }); } catch(e) { firstEmpty.focus(); }
        }
    }
}

function loseGame() {
    isGameOver = true;
    const msg = document.getElementById('message');
    msg.innerText = "לא נורא! הנה הפתרון המלא:";
    msg.style.color = "var(--error-border)";

    const inputs = document.querySelectorAll('.crypto-input');
    inputs.forEach(input => {
        if (!input.classList.contains('correct')) {
            const displayChar = input.dataset.displayChar;
            input.value = displayChar;
            input.classList.add('revealed');
            input.parentElement.classList.add('is-revealed');
            input.readOnly = true;
            input.tabIndex = -1;
            let numberLabel = input.nextElementSibling;
            if (displayChar === 'י') {
                input.parentElement.classList.add('has-yod');
            }
            if (numberLabel) numberLabel.style.visibility = 'hidden';
        }
    });
}

function nextLevel() {
    document.getElementById('win-modal').style.display = 'none';
    if (currentLevelIndex + 1 < allQuotes.length) {
        startLevel(currentLevelIndex + 1, false, true);
    } else {
        alert("כל הכבוד! סיימת את כל השלבים במשחק!");
        backToMap();
    }
}

function nextSuperLevel() {
    document.getElementById('super-win-modal').style.display = 'none';
    nextLevel();
}

function restartLevel() {
    userStats.currentStreak = 0; // אתחול הרצף
    saveStats();
    document.getElementById('game-over-modal').style.display = 'none';
    startLevel(currentLevelIndex);
}

function startPracticeMode() {
    userStats.currentStreak = 0; // אתחול הרצף
    saveStats();
    document.getElementById('game-over-modal').style.display = 'none';
    startLevel(currentLevelIndex, true);
}

function getSaveKey(index) {
    return 'cryptogram_save_' + index;
}

function saveGameState() {
    if (isGameOver || isEndlessMode) return;

    const inputs = {};
    document.querySelectorAll('.crypto-input').forEach((input, idx) => {
        // שומרים רק אם יש ערך, והתא לא מסומן כשגוי כרגע
        if (input.value && !input.classList.contains('wrong')) {
            inputs[idx] = input.value;
        }
    });

    const state = {
        cipherMap: cipherMap,
        prefilled: Array.from(prefilledGlobalIndices),
        inputs: inputs,
        strikes: strikes,
        correctCells: correctCells
    };

    localStorage.setItem(getSaveKey(currentLevelIndex), JSON.stringify(state));
}

function clearSavedGame(index) {
    localStorage.removeItem(getSaveKey(index));
}

async function startLevel(levelIndex, practiceMode = false, forcePlay = false) {
    // סגירת מקלדת אוטומטית בכניסה לשלב
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }

    if (!practiceMode && !forcePlay && levelIndex < maxLevelReached - 1) {
        currentLevelIndex = levelIndex;
        currentQuoteData = allQuotes[levelIndex];
        showWinModal(true);
        return;
    }

    currentLevelIndex = levelIndex;
    currentQuoteData = allQuotes[levelIndex];

    // מעבר למסך המשחק
    document.getElementById('map-view').classList.add('hidden');
    const gameView = document.getElementById('game-view');
    gameView.classList.remove('hidden');

    gameView.classList.remove('fade-in');
    void gameView.offsetWidth; // trigger reflow
    gameView.classList.add('fade-in');

    // הוספת היסטוריה כדי שכפתור החזרה של אנדרואיד יעבוד
    history.pushState({ level: levelIndex }, "", "#level");
    // איפוס משתני משחק
    isGameOver = false;
    strikes = 0;
    isEndlessMode = practiceMode; // קביעת מצב המשחק (רגיל או אימון)
    futureHintUsed = false; // איפוס השימוש ברמז עתידי
    isHintMode = false;
    document.getElementById('game-board').classList.remove('hint-mode');
    document.querySelectorAll('.header-icon-btn').forEach(btn => btn.classList.remove('active'));
    updateStrikesDisplay();
    updateHintButton();

    document.getElementById('current-level-num').innerText = (levelIndex + 1);
    const mobileTitle = document.getElementById('mobile-level-title');
    if (mobileTitle) {
        mobileTitle.innerText = `שלב ${levelIndex + 1}`;
    }

    document.getElementById('message').innerText = "";
    document.getElementById('author-name').innerText = currentQuoteData.author;
    document.getElementById('difficulty').innerText = "רמה: " + (currentQuoteData.difficulty || "?");

    const savedStateJson = !practiceMode && !forcePlay ? localStorage.getItem(getSaveKey(levelIndex)) : null;

    if (savedStateJson) {
        const state = JSON.parse(savedStateJson);
        cipherMap = state.cipherMap;
        prefilledGlobalIndices = new Set(state.prefilled);
        strikes = state.strikes;

        // שחזור uniqueLettersGlobal
        let positionsMap = {};
        for (let i = 0; i < currentQuoteData.quote.length; i++) {
            let cleanChar = currentQuoteData.quote[i].replace(/[\u0591-\u05C7]/g, '');
            let normChar = hebrewFinalToRegular[cleanChar] || cleanChar;
            if (/^[א-ת]$/.test(normChar)) {
                if (!positionsMap[normChar]) positionsMap[normChar] = [];
                positionsMap[normChar].push(i);
            }
        }
        uniqueLettersGlobal = Object.keys(positionsMap);

        renderKeyboard();
        renderBoard(currentQuoteData.quote);

        // שחזור קלט
        const allInputs = document.querySelectorAll('.crypto-input');
        Object.keys(state.inputs).forEach(idx => {
            if (allInputs[idx]) {
                // אם התא הוא רמז התחלתי (prefilled), renderBoard כבר ספר אותו
                // ולכן נדלג עליו כאן כדי למנוע ספירה כפולה
                if (allInputs[idx].classList.contains('prefilled')) {
                    return;
                }
                const val = state.inputs[idx];
                allInputs[idx].value = val;

                let cleanVal = val.replace(/[\u0591-\u05C7]/g, '');
                let normalizedVal = hebrewFinalToRegular[cleanVal] || cleanVal;
                let normChar = allInputs[idx].dataset.original;

                if (normalizedVal === normChar) {
                    allInputs[idx].classList.add('correct');
                    allInputs[idx].parentElement.classList.add('is-correct');
                    allInputs[idx].readOnly = true;
                    allInputs[idx].tabIndex = -1;
                    correctCells++;
                }
                if (val === 'י') {
                    allInputs[idx].parentElement.classList.add('has-yod');
                }
            }
        });

        // עדכון הסתרת המספרים עבור אותיות שהושלמו לאחר טעינת המשחק
        uniqueLettersGlobal.forEach(letter => checkLetterCompletion(letter));
    } else {
        generateCipherAndHints(currentQuoteData.quote);
        renderKeyboard();
        renderBoard(currentQuoteData.quote);
    }

    updateKeyboardState(); // עדכון צבעי המקלדת מיד בפתיחת השלב

    const firstEditable = document.querySelector('.crypto-input:not(.correct):not(.revealed)');
    if (firstEditable) {
        firstEditable.focus();
        lastFocusedInput = firstEditable;
    }

    // פתיחת הוראות אוטומטית בשלב הראשון (רק בפעם הראשונה)
    if (levelIndex === 0 && !practiceMode && !localStorage.getItem('cryptogramTutorialSeen')) {
        setTimeout(() => {
            toggleModal(true);
            localStorage.setItem('cryptogramTutorialSeen', 'true');
        }, 500);
    }
}

function createStatsModal() {
    if (document.getElementById('stats-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'stats-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal" onclick="document.getElementById('stats-modal').style.display='none'">&times;</span>
            <h2 style="margin-bottom: 5px;">הפרופיל שלי</h2>
            <div class="stats-container">
                <div class="stat-box">
                    <div class="stat-icon">🧠</div>
                    <div class="stat-num" id="stat-solved">0</div>
                    <div class="stat-label">חידות שפתרת</div>
                </div>
                <div class="stat-box">
                    <div class="stat-icon">🔥</div>
                    <div class="stat-num" id="stat-streak">0</div>
                    <div class="stat-label">השיא ברצף</div>
                </div>
                <div class="stat-box">
                    <div class="stat-icon">✨</div>
                    <div class="stat-num" id="stat-perfect">0</div>
                    <div class="stat-label">חידות מושלמות</div>
                </div>
            </div>
            <h3 style="margin-top: 25px; color: var(--text-main); font-size: 1.3rem; border-bottom: 2px solid #f4ece4; padding-bottom: 5px;">תגים והישגים</h3>
            <div id="badges-container" class="badges-grid"></div>
        </div>
    `;
    document.body.appendChild(modal);
}

function showStatsModal() {
    document.getElementById('stat-solved').innerText = userStats.totalSolved;
    document.getElementById('stat-streak').innerText = userStats.maxStreak;
    document.getElementById('stat-perfect').innerText = userStats.perfectGames;

    const badgesContainer = document.getElementById('badges-container');
    badgesContainer.innerHTML = '';

    ACHIEVEMENT_CATEGORIES.forEach(cat => {
        const statValue = userStats[cat.stat] || 0;
        let currentLevel = 0;
        for (let i = 0; i < cat.levels.length; i++) {
            if (statValue >= cat.levels[i]) {
                currentLevel = i + 1;
            }
        }

        const isUnlocked = currentLevel > 0;
        
        let detailsHtml = '';
        if (isUnlocked) {
            // קביעת היעד לרמה הבאה
            const target = currentLevel < 5 ? cat.levels[currentLevel] : cat.levels[4];
            const progressPercent = Math.min(100, (statValue / target) * 100);

            // יצירת כוכבים
            let starsHtml = '';
            for (let i = 1; i <= 5; i++) {
                starsHtml += `<span class="star ${i <= currentLevel ? 'filled' : 'empty'}">${i <= currentLevel ? '★' : '☆'}</span>`;
            }

            detailsHtml = `
                <div class="badge-stars" style="margin: 3px 0; font-size: 1.3rem;">${starsHtml}</div>
                <div class="badge-progress-bar">
                    <div class="badge-progress-fill" style="width: ${progressPercent}%;"></div>
                </div>
                <div class="badge-desc" style="font-size: 0.9em; margin-top: 4px; display: flex; justify-content: space-between; width: 100%;">
                    <span>${cat.desc}</span>
                    <span style="direction: ltr; font-weight: 600;">${statValue.toLocaleString()} / ${target.toLocaleString()}</span>
                </div>
            `;
        }

        const badgeEl = document.createElement('div');
        badgeEl.className = `badge ${isUnlocked ? 'unlocked' : 'locked'}`;
        badgeEl.innerHTML = `
            <div class="badge-icon">${cat.icon}</div>
            <div class="badge-info" style="flex: 1; width: 100%;">
                <div class="badge-name">${cat.name}</div>
                ${detailsHtml}
            </div>
        `;
        badgesContainer.appendChild(badgeEl);

    });

    document.getElementById('stats-modal').style.display = 'flex';
}

function renderMap() {
    const pathContainer = document.getElementById('levels-path');
    pathContainer.innerHTML = '';

    if (superQuotes.length === 0) {
        document.getElementById('map-message').innerText = 'טוען מפת שלבים...';
        return;
    }

    const sq = superQuotes[currentMapIndex];
    const range = superQuoteRanges[currentMapIndex];

    const mapMessageContainer = document.getElementById('map-message');
    mapMessageContainer.innerHTML = ''; // ניקוי תוכן קודם
    mapMessageContainer.style.display = 'flex';
    mapMessageContainer.style.flexDirection = 'column';
    mapMessageContainer.style.alignItems = 'center';
    mapMessageContainer.style.width = '100%';

    // שורת לחצנים עליונה
    const topRow = document.createElement('div');
    topRow.style.width = '100%';
    topRow.style.display = 'flex';
    topRow.style.justifyContent = 'flex-end'; // דוחף את הכפתור לשמאל
    topRow.style.marginBottom = '15px';

    const profileBtn = document.createElement('button');
    profileBtn.innerHTML = '🏆 סטטיסטיקה אישית';
    profileBtn.innerHTML = '🏆 הפרופיל שלי';
    profileBtn.className = 'btn-new';
    profileBtn.style.backgroundColor = 'var(--tile-bg)';
    profileBtn.style.color = 'var(--text-main)';
    profileBtn.style.border = '2px dashed var(--primary)';
    profileBtn.onclick = showStatsModal;

    topRow.appendChild(profileBtn);

    const navRow = document.createElement('div');
    navRow.style.display = 'flex';
    navRow.style.justifyContent = 'center';
    navRow.style.alignItems = 'center';
    navRow.style.gap = '10px';

    const prevBtn = document.createElement('button');
    prevBtn.innerText = '«';
    prevBtn.title = "לוח קודם";
    prevBtn.onclick = () => navigateMap(-1);
    prevBtn.disabled = currentMapIndex === 0;
    prevBtn.className = 'btn-new';

    const mapLabel = document.createElement('span');
    mapLabel.innerText = `לוח ${currentMapIndex + 1} מתוך ${superQuotes.length}`;
    mapLabel.style.margin = '0 15px';
    mapLabel.style.fontWeight = 'bold';

    const nextBtn = document.createElement('button');
    nextBtn.innerText = '»';
    nextBtn.title = "לוח הבא";
    nextBtn.onclick = () => navigateMap(1);
    const maxReachedSqIndex = superQuoteRanges.findIndex(range => (maxLevelReached - 1) < range.end);
    const furthestAllowedIndex = maxReachedSqIndex === -1 ? superQuotes.length - 1 : maxReachedSqIndex;
    nextBtn.disabled = currentMapIndex >= furthestAllowedIndex;
    nextBtn.className = 'btn-new';

    navRow.appendChild(prevBtn);
    navRow.appendChild(mapLabel);
    navRow.appendChild(nextBtn);
    
    mapMessageContainer.appendChild(topRow);
    mapMessageContainer.appendChild(navRow);

    // בניית הלוח של הסופר-ציטוט
    let levelCounter = range.start; // אינדקס גלובלי של השלבים (0-based)
    const currentLevelIdx = maxLevelReached - 1;

    const words = sq.quote.split(' ');

    words.forEach(word => {
        const wordDiv = document.createElement('div');
        wordDiv.className = 'word';

        for (let i = 0; i < word.length; i++) {
            let char = word[i];
            let clean = char.replace(/[\u0591-\u05C7]/g, '');
            let norm = hebrewFinalToRegular[clean] || clean;

            if (hebrewAlphabet.includes(norm)) {
                // זהו שלב במשחק
                let isDone = levelCounter < currentLevelIdx;
                let isCurrent = levelCounter === currentLevelIdx;
                let isLocked = levelCounter > currentLevelIdx;

                let cellContainer = document.createElement('div');
                cellContainer.className = 'cell-container map-cell-container';

                let btn = document.createElement('div');
                btn.className = 'map-cell';

                if (isDone) {
                    btn.classList.add('done');
                    btn.innerText = clean; // הצגת האות
                } else if (isCurrent) {
                    btn.classList.add('current');
                    btn.innerText = "?";
                } else {
                    btn.classList.add('locked');
                }

                if (!isLocked) {
                    let idxToStart = levelCounter;
                    btn.onclick = () => startLevel(idxToStart);
                }

                let label = document.createElement('div');
                label.className = 'cipher-number';
                label.innerText = levelCounter + 1;

                cellContainer.appendChild(btn);
                cellContainer.appendChild(label);
                wordDiv.appendChild(cellContainer);

                levelCounter++;
            } else {
                // סימן פיסוק
                let punctDiv = document.createElement('div');
                punctDiv.className = 'punctuation';
                punctDiv.innerText = char;
                wordDiv.appendChild(punctDiv);
            }
        }
        pathContainer.appendChild(wordDiv);
    });
}

function setupMobileHeader() {
    const gameView = document.getElementById('game-view');
    if (!gameView || document.getElementById('mobile-game-header')) return;

    // יצירת סרגל כלים עליון
    const header = document.createElement('div');
    header.id = 'mobile-game-header';

    // קבוצה שמאלית: פסילות ורמז
    const leftGroup = document.createElement('div');
    leftGroup.className = 'header-group';

    // מד פסילות (לב)
    const strikesBox = document.createElement('div');
    strikesBox.id = 'mobile-strikes-box';
    strikesBox.className = 'header-stat-box oval-btn';
    strikesBox.innerHTML = `${ICONS.heart} <span id="mobile-strikes-display">${MAX_STRIKES}</span>`;

    // כפתור רמז
    const hintBtn = document.createElement('button');
    hintBtn.id = 'mobile-hint-btn';
    hintBtn.className = 'header-icon-btn oval-btn';
    hintBtn.onclick = giveHint;
    hintBtn.innerHTML = `${ICONS.bulb} <span>${availableHints}</span>`;

    leftGroup.appendChild(strikesBox);
    leftGroup.appendChild(hintBtn);

    // קבוצה ימנית: הוראות ובית
    const rightGroup = document.createElement('div');
    rightGroup.className = 'header-group';

    // כפתור בית
    const homeBtn = document.createElement('button');
    homeBtn.className = 'header-icon-btn round-btn';
    homeBtn.innerHTML = `${ICONS.home}`;
    homeBtn.onclick = backToMap;

    // כפתור הוראות
    const helpBtn = document.createElement('button');
    helpBtn.className = 'header-icon-btn round-btn';
    helpBtn.innerHTML = `${ICONS.help}`;
    helpBtn.onclick = () => toggleModal(true);

    rightGroup.appendChild(helpBtn);
    rightGroup.appendChild(homeBtn);

    // אלמנט כותרת השלב
    const levelTitle = document.createElement('div');
    levelTitle.id = 'mobile-level-title';
    levelTitle.style.fontWeight = 'bold';
    levelTitle.style.fontSize = '1.2rem';
    levelTitle.style.color = 'var(--text-main)';

    header.appendChild(leftGroup);
    header.appendChild(levelTitle);
    header.appendChild(rightGroup);

    gameView.insertBefore(header, gameView.firstChild);
}

async function initApp() {
    try {
        setupMobileHeader();

        // 1. מאזין למקלדת (למחשב - מה שכבר יש לך)
        document.addEventListener('keydown', (e) => {
            if (e.key === "Escape") {
                handleBackLogic();
            }
        });

        // 2. מאזין לכפתור חזור של אנדרואיד (ל-Capacitor)
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
            window.Capacitor.Plugins.App.addListener('backButton', () => {
                handleBackLogic();
            });
        }

        loadStats();
        createStatsModal();
        await loadQuotes();

        // חישוב האינדקס והצגת המפה
        let currentLevelIdx = maxLevelReached - 1;
        currentMapIndex = superQuoteRanges.findIndex(range => currentLevelIdx < range.end);
        if (currentMapIndex === -1) {
            currentMapIndex = superQuotes.length > 0 ? superQuotes.length - 1 : 0;
        }
        renderMap();
    } catch (err) {
        console.error("שגיאה בטעינת האפליקציה:", err);
    } finally {
        // הסתרת מסך הפתיחה (Splash Screen) בצורה יזומה לאחר סיום הטעינה (או במקרה שגיאה)
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SplashScreen) {
            await window.Capacitor.Plugins.SplashScreen.hide();
        }
    }
}

// פונקציה מרכזית שמנהלת את ה"חזור" כדי לא לשכפל קוד
function handleBackLogic() {
    // 1. קודם כל בודקים אם יש חלונית (Modal) פתוחה, ואם כן - סוגרים אותה
    const modals = document.querySelectorAll('.modal');
    let isModalOpen = false;
    modals.forEach(m => {
        if (m.style.display === 'flex' || m.style.display === 'block') {
            m.style.display = 'none';
            isModalOpen = true;
        }
    });
    if (isModalOpen) return;

    const gameView = document.getElementById('game-view');

    if (gameView && !gameView.classList.contains('hidden')) {
        // אם אנחנו בתוך משחק - חזור למפה
        backToMap();
    } else {
        // אם אנחנו כבר במפה - נצא מהאפליקציה בצורה מסודרת
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
            window.Capacitor.Plugins.App.exitApp();
        }
    }
}
    
window.onload = initApp;