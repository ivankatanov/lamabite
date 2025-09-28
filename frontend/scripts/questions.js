(function () {
    const tg = window.Telegram?.WebApp;
    if (tg) {
        tg.ready();
        tg.expand();
    }

    const container = document.getElementById('question-container');
    if (!container) {
        return;
    }

    const progressLabel = document.getElementById('progress-label');
    const progressPercent = document.getElementById('progress-percent');
    const progressBar = document.getElementById('progress-bar');
    const progressFill = document.getElementById('progress-fill');
    const questionMeta = document.getElementById('question-meta');
    const questionTitle = document.getElementById('question-title');
    const questionDescription = document.getElementById('question-description');
    const questionContent = document.getElementById('question-content');
    const backButton = document.getElementById('back-button');
    const nextButton = document.getElementById('next-button');
    const isCoarsePointer = window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false;

    function sanitizeNumericString(value, allowDecimal) {
        if (typeof value !== 'string') {
            return '';
        }

        let sanitized = '';
        let hasSeparator = false;
        for (const char of value) {
            if (/\d/.test(char)) {
                sanitized += char;
            } else if (allowDecimal && (char === '.' || char === ',')) {
                if (!hasSeparator) {
                    sanitized += ',';
                    hasSeparator = true;
                }
            }
        }

        return sanitized;
    }

    function parseNumericValue(value, allowDecimal) {
        const sanitized = sanitizeNumericString(value, allowDecimal).trim();
        if (sanitized === '') {
            return null;
        }

        const normalized = allowDecimal ? sanitized.replace(',', '.') : sanitized;
        const numeric = Number(normalized);
        if (!Number.isFinite(numeric)) {
            return null;
        }

        return allowDecimal ? numeric : Math.trunc(numeric);
    }

    function createNumericTextInput(options) {
        const { allowDecimal, placeholder, enterKeyHint, onEnter } = options;

        const input = document.createElement('input');
        input.type = 'text'; // Используем text вместо number для iOS
        input.className = 'input';
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.autocapitalize = 'none';
        input.autocorrect = 'off';
        input.inputMode = 'text'; // Показывает обычную текстовую клавиатуру
        // Убрали pattern для iOS, чтобы не ограничивать ввод только цифрами
        input.enterKeyHint = 'done'; // Показывает кнопку "Готово" на клавиатуре
        
        if (placeholder) {
            input.placeholder = placeholder;
        }
        
        const sanitize = () => {
            const sanitized = sanitizeNumericString(input.value, allowDecimal);
            if (sanitized !== input.value) {
                input.value = sanitized;
            }
        };

        input.addEventListener('input', sanitize);
        input.addEventListener('blur', sanitize);
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                if (typeof onEnter === 'function') {
                    onEnter();
                } else {
                    input.blur();
                }
            }
        });
        
        return input;
    }

    function isWithinRange(value, min, max) {
        if (typeof min === 'number' && value < min) {
            return false;
        }
        if (typeof max === 'number' && value > max) {
            return false;
        }
        return true;
    }

    function formatRangeHelper(min, max) {
        if (typeof min === 'number' && typeof max === 'number') {
            return `Введите целое число в диапазоне от ${min} до ${max}.`;
        }
        if (typeof min === 'number') {
            return `Введите значение не меньше ${min}.`;
        }
        if (typeof max === 'number') {
            return `Введите значение не больше ${max}.`;
        }
        return 'Введите числовое значение.';
    }

    function formatRangeError(min, max) {
        if (typeof min === 'number' && typeof max === 'number') {
            return `Используйте значение от ${min} до ${max}.`;
        }
        if (typeof min === 'number') {
            return `Используйте значение не меньше ${min}.`;
        }
        if (typeof max === 'number') {
            return `Используйте значение не больше ${max}.`;
        }
        return 'Введите корректное числовое значение.';
    }

    const questions = [
        {
            id: 'steps',
            type: 'choice',
            title: 'Сколько шагов вы обычно делаете каждый день?',
            description: 'Вы можете найти это в ваших умных часах или приложении смартфона.',
            options: [
                { value: 'less_2200', label: 'Менее 2,200' },
                { value: '2201_4000', label: '2,201 до 4,000' },
                { value: '4001_6000', label: '4,001 до 6,000' },
                { value: '6001_8000', label: '6,001 до 8,000' },
                { value: '8001_10000', label: '8,001 до 10,000' },
                { value: '10001_more', label: '10,001 и более' },
                { value: 'dont_know', label: 'Я не знаю' }
            ]
        },
        {
            id: 'activity',
            type: 'choice',
            title: 'Как часто вы занимаетесь физической активностью?',
            description: 'Любые действия, которые повышают частоту сердечных сокращений и дыхания, такие как быстрая ходьба, бег или езда на велосипеде — всё имеет значение.',
            options: [
                { value: 'rarely_never', label: 'Редко или никогда' },
                { value: '1_2_times', label: '1–2 раза в неделю' },
                { value: '3_4_times', label: '3–4 раза в неделю' },
                { value: '5_more_times', label: '5 или более раз в неделю' }
            ]
        },
        {
            id: 'sleep',
            type: 'choice',
            title: 'Сколько часов сна вы обычно получаете за ночь?',
            description: 'Оцените среднюю продолжительность ночного сна за последний год или проверьте её с помощью смартфона или устройства.',
            options: [
                { value: 'less_5', label: 'Менее 5 часов' },
                { value: '5_6', label: '5–6 часов' },
                { value: '7_8', label: '7–8 часов' },
                { value: 'more_8', label: 'Более 8 часов' }
            ]
        },
        {
            id: 'smoking',
            type: 'choice',
            title: 'Какой у вас опыт с курением?',
            description: 'Учитываются любые табачные изделия, включая электронные сигареты, сигары, POD-системы, IQOS, кальян и другие.',
            options: [
                { value: 'daily', label: 'Ежедневно' },
                { value: 'sometimes', label: 'Иногда' },
                { value: 'quit_1_5', label: 'Бросил(а) 1–5 лет назад' },
                { value: 'quit_5_10', label: 'Бросил(а) 5–10 лет назад' },
                { value: 'quit_10_plus', label: 'Бросил(а) более 10 лет назад' },
                { value: 'never', label: 'Никогда не курил(а)' }
            ]
        },
        {
            id: 'alcohol',
            type: 'choice',
            title: 'Сколько алкоголя вы потребляете?',
            description: 'Один напиток — это стандартная порция: 1 бокал вина, 1 бокал пива, 1 рюмка крепкого алкоголя и т.д. Оцените среднее количество за последний год.',
            options: [
                { value: 'rarely', label: 'Редко или никогда' },
                { value: 'few_month', label: 'Несколько напитков в месяц' },
                { value: 'few_week', label: 'Несколько напитков в неделю' },
                { value: '1_2_day', label: '1–2 напитка в день' },
                { value: '3_plus_day', label: '3 или более напитков в день' }
            ]
        },
        {
            id: 'seatbelt',
            type: 'choice',
            title: 'Пристегиваете ли вы ремень безопасности при поездке на автомобиле?',
            description: 'Учитывайте все поездки, независимо от того, ведёте ли вы машину, сидите на переднем или заднем сиденье.',
            options: [
                { value: 'always', label: 'Всегда или почти всегда' },
                { value: 'sometimes', label: 'Время от времени' },
                { value: 'rarely', label: 'Редко или никогда' }
            ]
        },
        {
            id: 'phone_driving',
            type: 'choice',
            title: 'Используете ли вы телефон за рулем?',
            description: 'Как звонки, так и набор текста.',
            options: [
                { value: 'no_drive', label: 'Я не вожу' },
                { value: 'never', label: 'Никогда' },
                { value: 'sometimes', label: 'Иногда' },
                { value: 'often', label: 'Часто' }
            ]
        },
        {
            id: 'motorcycle',
            type: 'choice',
            title: 'Вы ездите на мотоцикле?',
            description: 'Будь то в качестве водителя или пассажира.',
            options: [
                { value: 'no', label: 'Нет' },
                { value: 'yes', label: 'Да' }
            ]
        },
        {
            id: 'social_hours',
            type: 'choice',
            title: 'Сколько часов в месяц вы проводите в общении?',
            description: 'Учтите взаимодействия с друзьями, семьёй, в сообществе или на групповых встречах.',
            options: [
                { value: 'lt_2', label: 'Менее 2 часов' },
                { value: '2_15', label: '2–15 часов' },
                { value: '15_plus', label: '15 и более часов' }
            ]
        },
        {
            id: 'relationship_status',
            type: 'choice',
            title: 'Какое описание лучше всего характеризует ваше семейное положение?',
            options: [
                { value: 'single', label: 'Холост/не замужем' },
                { value: 'relationship', label: 'В серьёзных отношениях' },
                { value: 'married', label: 'В браке' },
                { value: 'divorced', label: 'В разводе' },
                { value: 'widowed', label: 'Вдовец/вдова' }
            ]
        },
        {
            id: 'relationship_satisfaction',
            type: 'choice',
            title: 'Насколько вы удовлетворены своими отношениями?',
            description: 'Оцените эмоциональную удовлетворённость за последний год или ваши чувства по поводу отсутствия отношений.',
            options: [
                { value: '1', label: '1 из 5 (Очень недоволен)' },
                { value: '2', label: '2 из 5' },
                { value: '3', label: '3 из 5' },
                { value: '4', label: '4 из 5' },
                { value: '5', label: '5 из 5 (Очень доволен)' }
            ]
        },
        {
            id: 'stress',
            type: 'choice',
            title: 'Насколько вы чувствуете себя в стрессе в целом?',
            description: 'Оцените ваш средний уровень стресса за прошедший год.',
            options: [
                { value: '1', label: '1 из 5 (Совсем не испытываю стресс)' },
                { value: '2', label: '2 из 5' },
                { value: '3', label: '3 из 5' },
                { value: '4', label: '4 из 5' },
                { value: '5', label: '5 из 5 (Очень высокий стресс)' }
            ]
        },
        {
            id: 'happiness',
            type: 'choice',
            title: 'Насколько вы счастливы в целом?',
            description: 'Оцените ваш средний уровень счастья за последний год.',
            options: [
                { value: '1', label: '1 из 5 (Совсем несчастлив)' },
                { value: '2', label: '2 из 5' },
                { value: '3', label: '3 из 5' },
                { value: '4', label: '4 из 5' },
                { value: '5', label: '5 из 5 (Очень счастлив)' }
            ]
        },
        {
            id: 'bmi',
            type: 'bmi_calculator',
            title: 'Какой у вас ИМТ (индекс массы тела)?',
            description: 'Если вы не знаете свой ИМТ, используйте калькулятор ниже.',
            options: [
                { value: 'underweight', label: 'Недостаточный вес (менее 18.5)' },
                { value: 'normal', label: 'Нормальный вес (18.5–24.9)' },
                { value: 'overweight', label: 'Избыточный вес (25–29.9)' },
                { value: 'obesity', label: 'Ожирение (более 30)' }
            ]
        },
        {
            id: 'gender',
            type: 'choice',
            title: 'Какой у вас биологический пол?',
            options: [
                { value: 'male', label: 'Мужской' },
                { value: 'female', label: 'Женский' }
            ]
        },
        {
            id: 'age',
            type: 'number',
            title: 'Сколько вам лет?',
            description: 'Возраст должен быть больше 18 и меньше 90.',
            min: 18,
            max: 90,
            placeholder: 'Например, 26'
        },
        {
            id: 'cvd_history',
            type: 'choice',
            title: 'Есть ли у вас история сердечно-сосудистых заболеваний (ССЗ)?',
            description: 'Это включает любые диагностированные заболевания сердца или перенесённые сердечные события.',
            options: [
                { value: 'none', label: 'Нет' },
                { value: 'single', label: 'Одно событие' },
                { value: 'multiple', label: 'Несколько событий' }
            ]
        },
        {
            id: 'long_lived_relatives',
            type: 'choice',
            title: 'Сколько из ваших родителей или бабушек/дедушек прожили более 90 лет?',
            options: [
                { value: '0', label: '0' },
                { value: '1', label: '1' },
                { value: '2', label: '2' },
                { value: '3', label: '3' },
                { value: '4', label: '4' },
                { value: '5', label: '5' },
                { value: '6', label: '6' }
            ]
        },
        {
            id: 'family_conditions',
            type: 'choice',
            title: 'У скольких из ваших родителей или бабушек/дедушек есть или были ССЗ, диабет или рак?',
            options: [
                { value: '0', label: '0' },
                { value: '1', label: '1' },
                { value: '2', label: '2' },
                { value: '3', label: '3' },
                { value: '4', label: '4' },
                { value: '5', label: '5' },
                { value: '6', label: '6' }
            ]
        },
        {
            id: 'country_current',
            type: 'country',
            title: 'В какой стране вы преимущественно проживали последние 10 лет?',
            options: (window.LifeTestConfig?.countries ?? []).map((country) => ({
                value: country.name,
                label: country.name
            }))
        },
        {
            id: 'country_future',
            type: 'country',
            title: 'В какой стране вы планируете проживать большую часть следующих 10 лет?',
            description: 'Это ключевой предиктор ожидаемой продолжительности жизни: между странами могут быть различия до 40 лет.',
            options: (window.LifeTestConfig?.countries ?? []).map((country) => ({
                value: country.name,
                label: country.name
            }))
        }
    ];

    const total = questions.length;
    const storedAnswers = JSON.parse(localStorage.getItem('kamalama_answers') || '{}');
    const answers = { ...storedAnswers };

    let currentIndex = questions.findIndex((question) => !isAnswered(answers[question.id], question.type));
    if (currentIndex === -1) {
        currentIndex = 0;
    }

    renderQuestion();
    updateNavigation();
    updateProgress();

    backButton.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex -= 1;
            renderQuestion();
            updateNavigation();
            updateProgress();
        }
    });

    nextButton.addEventListener('click', () => {
        const question = questions[currentIndex];
        if (!isAnswered(answers[question.id], question.type)) {
            return;
        }

        if (currentIndex === total - 1) {
            persistAnswers();
            window.location.href = 'results.html';
            return;
        }

        currentIndex += 1;
        renderQuestion();
        updateNavigation();
        updateProgress();
    });

    function renderQuestion() {
        const question = questions[currentIndex];
        const step = currentIndex + 1;

        progressLabel.textContent = `Вопрос ${step} из ${total}`;
        questionMeta.textContent = `Вопрос ${step} из ${total}`;
        questionTitle.textContent = question.title;
        questionDescription.textContent = question.description ?? '';
        questionDescription.style.display = question.description ? 'block' : 'none';

        questionContent.innerHTML = '';

        if (question.type === 'choice') {
            renderChoiceQuestion(question);
        } else if (question.type === 'number') {
            renderNumberQuestion(question);
        } else if (question.type === 'country') {
            renderCountryQuestion(question);
        } else if (question.type === 'bmi' || question.type === 'bmi_calculator') {
            renderBmiQuestion(question);
        }

        nextButton.disabled = !isAnswered(answers[question.id], question.type);
        nextButton.textContent = currentIndex === total - 1 ? 'Получить результат' : 'Далее';
    }

    function renderChoiceQuestion(question) {
        const group = document.createElement('div');
        group.className = 'options-group';
        group.setAttribute('role', 'radiogroup');
        group.setAttribute('aria-label', question.title);
        const selectedValue = answers[question.id] ?? null;

        question.options.forEach((option, index) => {
            const optionId = `${question.id}-${index}`;
            const wrapper = document.createElement('label');
            wrapper.className = 'option option-choice';
            wrapper.setAttribute('for', optionId);

            const input = document.createElement('input');
            input.type = 'radio';
            input.name = question.id;
            input.id = optionId;
            input.value = option.value;
            input.checked = selectedValue === option.value;

            input.addEventListener('change', () => {
                answers[question.id] = option.value;
                persistAnswers();
                Array.from(group.querySelectorAll('.option')).forEach((element) => {
                    element.classList.toggle('selected', element.contains(input) && input.checked);
                });
                nextButton.disabled = false;
            });

            const text = document.createElement('span');
            text.className = 'option-text';
            text.textContent = option.label;

            wrapper.appendChild(input);
            wrapper.appendChild(text);

            if (input.checked) {
                wrapper.classList.add('selected');
            }

            group.appendChild(wrapper);
        });

        questionContent.appendChild(group);
    }

    function ensureNextVisible() {
        if (!isCoarsePointer || !nextButton) {
            return;
        }
        window.setTimeout(() => {
            nextButton.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 200);
    }

    function renderNumberQuestion(question) {
        const field = document.createElement('div');
        field.className = 'field stack';

        const input = createNumericTextInput({
            allowDecimal: false,
            placeholder: question.placeholder,
            enterKeyHint: 'done',
            onEnter: () => {
                if (!nextButton.disabled) {
                    input.blur();
                    nextButton.click();
                } else {
                    input.blur();
                }
            }
        });

        const savedValue = answers[question.id];
        if (savedValue !== undefined && savedValue !== null && savedValue !== '') {
            input.value = savedValue;
        }

        const helper = document.createElement('p');
        const helperDefault = formatRangeHelper(question.min, question.max);
        helper.className = 'muted';
        helper.textContent = helperDefault;

        input.addEventListener('focus', ensureNextVisible);
        const handleValueChange = () => {
            const value = input.value.trim();
            const numericValue = parseNumericValue(value, false);
            const hasValue = value !== '';
            const valid = numericValue !== null && isWithinRange(numericValue, question.min, question.max);

            if (valid) {
                answers[question.id] = numericValue;
            } else {
                delete answers[question.id];
            }

            persistAnswers();
            nextButton.disabled = !valid;

            if (!hasValue) {
                helper.className = 'muted';
                helper.textContent = helperDefault;
                return;
            }

            if (valid) {
                helper.className = 'muted';
                helper.textContent = helperDefault;
            } else {
                helper.className = 'error';
                helper.textContent = formatRangeError(question.min, question.max);
            }
        };

        input.addEventListener('input', handleValueChange);
        input.addEventListener('blur', handleValueChange);

        field.appendChild(input);
        field.appendChild(helper);
        questionContent.appendChild(field);
    }

    function renderCountryQuestion(question) {
        const field = document.createElement('div');
        field.className = 'field stack';

        const select = document.createElement('select');
        select.className = 'select';
        select.required = true;
        select.setAttribute('aria-label', question.title);
        select.addEventListener('focus', ensureNextVisible);

        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = 'Выберите страну';
        placeholderOption.disabled = true;
        select.appendChild(placeholderOption);

        question.options.forEach((option) => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            select.appendChild(optionElement);
        });

        if (answers[question.id]) {
            select.value = answers[question.id];
            placeholderOption.disabled = true;
            placeholderOption.selected = false;
        } else {
            placeholderOption.selected = true;
        }

        select.addEventListener('change', () => {
            const value = select.value;
            if (value) {
                answers[question.id] = value;
                persistAnswers();
                nextButton.disabled = false;
            } else {
                delete answers[question.id];
                persistAnswers();
                nextButton.disabled = true;
            }
        });

        field.appendChild(select);
        questionContent.appendChild(field);
    }

    function renderBmiQuestion(question) {
        const stored = answers[question.id];
        const selectedCategory = typeof stored === 'object' && stored !== null ? stored.category : stored;

        const group = document.createElement('div');
        group.className = 'options-group';
        group.setAttribute('role', 'radiogroup');
        group.setAttribute('aria-label', question.title);

        question.options.forEach((option, index) => {
            const optionId = `${question.id}-${index}`;
            const wrapper = document.createElement('label');
            wrapper.className = 'option option-choice';
            wrapper.setAttribute('for', optionId);

            const input = document.createElement('input');
            input.type = 'radio';
            input.name = question.id;
            input.id = optionId;
            input.value = option.value;
            input.checked = selectedCategory === option.value;

            input.addEventListener('change', () => {
                answers[question.id] = {
                    category: option.value,
                    bmi: stored && typeof stored === 'object' ? stored.bmi : null
                };
                persistAnswers();
                Array.from(group.querySelectorAll('.option')).forEach((element) => {
                    element.classList.toggle('selected', element.contains(input) && input.checked);
                });
                nextButton.disabled = false;
            });

            const text = document.createElement('span');
            text.className = 'option-text';
            text.textContent = option.label;

            wrapper.appendChild(input);
            wrapper.appendChild(text);

            if (input.checked) {
                wrapper.classList.add('selected');
            }

            group.appendChild(wrapper);
        });

        // Всегда создаем калькулятор ИМТ
        const calculator = document.createElement('div');
        calculator.className = 'bmi-calculator stack';
        calculator.style.display = 'block'; // Явно устанавливаем отображение

        const inputsRow = document.createElement('div');
        inputsRow.className = 'bmi-inputs';

        const heightWrapper = document.createElement('label');
        heightWrapper.className = 'field stack';
        heightWrapper.textContent = 'Рост (см)';
        const heightRange = { min: 100, max: 230 };
        let weightInput;
        const heightInput = createNumericTextInput({
            allowDecimal: false,
            placeholder: 'Например, 170',
            enterKeyHint: 'next',
            onEnter: () => {
                if (weightInput) {
                    weightInput.focus();
                } else {
                    heightInput.blur();
                }
            }
        });
        heightWrapper.appendChild(heightInput);

        const weightWrapper = document.createElement('label');
        weightWrapper.className = 'field stack';
        weightWrapper.textContent = 'Вес (кг)';
        const weightRange = { min: 30, max: 250 };
        weightInput = createNumericTextInput({
            allowDecimal: true,
            placeholder: 'Например, 65',
            enterKeyHint: 'done'
        });
        weightWrapper.appendChild(weightInput);

        inputsRow.appendChild(heightWrapper);
        inputsRow.appendChild(weightWrapper);

        const controls = document.createElement('div');
        controls.className = 'bmi-actions';

        const calculateButton = document.createElement('button');
        calculateButton.type = 'button';
        calculateButton.className = 'btn btn-secondary';
        calculateButton.textContent = 'Рассчитать ИМТ';

        const focusableInputs = [heightInput, weightInput];

        focusableInputs.forEach((input) => {
            input.addEventListener('focus', () => {
                ensureNextVisible();
            });
        });

        const status = document.createElement('p');
        status.className = 'muted';
        status.setAttribute('role', 'status');
        if (stored && typeof stored === 'object' && stored.bmi) {
            status.textContent = `Сохранённый результат: ${stored.bmi}. Категория — ${humanizeBmiCategory(stored.category)}.`;
        }

        calculateButton.addEventListener('click', () => {
            const active = document.activeElement;
            if (focusableInputs.includes(active)) {
                active.blur();
            }

            const height = parseNumericValue(heightInput.value, false);
            const weight = parseNumericValue(weightInput.value, true);
            if (height === null || weight === null) {
                status.className = 'error';
                status.textContent = 'Введите рост и вес, чтобы рассчитать ИМТ.';
                return;
            }

            if (!isWithinRange(height, heightRange.min, heightRange.max)) {
                status.className = 'error';
                status.textContent = `Рост должен быть в пределах ${heightRange.min}–${heightRange.max} см.`;
                return;
            }

            if (!isWithinRange(weight, weightRange.min, weightRange.max)) {
                status.className = 'error';
                status.textContent = `Вес должен быть в пределах ${weightRange.min}–${weightRange.max} кг.`;
                return;
            }

            const heightMeters = height / 100;
            const bmi = weight / (heightMeters * heightMeters);
            if (!Number.isFinite(bmi)) {
                status.className = 'error';
                status.textContent = 'Проверьте корректность введённых значений.';
                return;
            }

            const rounded = Math.round(bmi * 10) / 10;
            const category = bmiCategoryFromValue(rounded);
            status.className = 'muted';
            status.textContent = `Ваш ИМТ: ${rounded}. Категория — ${humanizeBmiCategory(category)}.`;

            const radio = group.querySelector(`input[value="${category}"]`);
            if (radio) {
                radio.checked = true;
                radio.dispatchEvent(new Event('change', { bubbles: true }));
                answers[question.id] = { category, bmi: rounded };
                persistAnswers();
                Array.from(group.querySelectorAll('.option')).forEach((element) => {
                    element.classList.toggle('selected', element.contains(radio) && radio.checked);
                });
                nextButton.disabled = false;
            }
        });

        controls.appendChild(calculateButton);
        calculator.appendChild(inputsRow);
        calculator.appendChild(controls);
        calculator.appendChild(status);

        questionContent.appendChild(group);
        questionContent.appendChild(calculator);
    }

    function bmiCategoryFromValue(value) {
        if (value < 18.5) {
            return 'underweight';
        }
        if (value < 25) {
            return 'normal';
        }
        if (value < 30) {
            return 'overweight';
        }
        return 'obesity';
    }

    function humanizeBmiCategory(category) {
        switch (category) {
            case 'underweight':
                return 'недостаточный вес';
            case 'normal':
                return 'нормальный вес';
            case 'overweight':
                return 'избыточный вес';
            case 'obesity':
                return 'ожирение';
            default:
                return 'не определено';
        }
    }

    function isAnswered(value, type) {
        if (type === 'choice' || type === 'country') {
            return value !== undefined && value !== null && value !== '';
        }

        if (type === 'number') {
            return typeof value === 'number' && !Number.isNaN(value);
        }

        if (type === 'bmi' || type === 'bmi_calculator') {
            if (!value) {
                return false;
            }
            if (typeof value === 'string') {
                return value !== '';
            }
            return typeof value === 'object' && value !== null && Boolean(value.category);
        }

        return false;
    }

    function persistAnswers() {
        localStorage.setItem('kamalama_answers', JSON.stringify(answers));
    }

    function updateNavigation() {
        backButton.disabled = currentIndex === 0;
    }

    function updateProgress() {
        const percent = Math.round(((currentIndex + 1) / total) * 100);
        progressPercent.textContent = `${percent}%`;
        progressFill.style.width = `${percent}%`;
        progressBar.setAttribute('aria-valuenow', String(percent));
        progressBar.setAttribute('aria-valuetext', `Завершено ${percent}%`);
    }
})();
