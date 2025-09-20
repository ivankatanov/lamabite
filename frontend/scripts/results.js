(function () {
    const tg = window.Telegram?.WebApp;
    if (tg) {
        tg.ready();
        tg.expand();
    }

    const loadingSection = document.getElementById('loading');
    const resultsSection = document.getElementById('results');
    const expectancyElement = document.getElementById('life-expectancy');
    const deltaElement = document.getElementById('result-delta');
    const insightsCard = document.getElementById('insights-card');
    const insightsList = document.getElementById('insights-list');
    const recommendationsCard = document.getElementById('recommendations-card');
    const recommendationsList = document.getElementById('recommendations-list');
    const metricsList = document.getElementById('metrics-list');
    const restartButton = document.getElementById('restart-button');
    const shareButton = document.getElementById('share-button');
    const spinnerElement = loadingSection?.querySelector('.spinner') ?? null;
    const loadingTitle = loadingSection?.querySelector('h2') ?? null;
    const loadingSubtitle = loadingSection?.querySelector('p') ?? null;
    let errorActionAdded = false;

    if (shareButton) {
        shareButton.disabled = true;
    }

    const requiredNodes = [loadingSection, resultsSection, expectancyElement, deltaElement, insightsList, recommendationsList, metricsList];
    if (requiredNodes.some((node) => !node)) {
        console.error('Не удалось инициализировать страницу результатов');
        return;
    }

    const rawAnswers = localStorage.getItem('kamalama_answers');
    if (!rawAnswers) {
        window.location.href = 'welcome.html';
        return;
    }

    let answers;
    try {
        answers = JSON.parse(rawAnswers);
    } catch (error) {
        console.error('Ошибка чтения ответов', error);
        window.location.href = 'welcome.html';
        return;
    }

    restartButton?.addEventListener('click', () => {
        localStorage.removeItem('kamalama_answers');
        window.location.href = 'welcome.html';
    });

    shareButton?.addEventListener('click', () => {
        if (!shareButton.dataset.expectancy) {
            return;
        }
        const expectancy = shareButton.dataset.expectancy;
        const shareText = encodeURIComponent(`Моя ожидаемая продолжительность жизни по тесту KamaLama BITE — ${expectancy} лет! Попробуйте и вы.`);
        const shareLink = `https://t.me/share/url?text=${shareText}`;
        if (tg?.openTelegramLink) {
            tg.openTelegramLink(shareLink);
        } else if (navigator.share) {
            navigator.share({ text: decodeURIComponent(shareText) }).catch(() => {
                window.open(shareLink, '_blank');
            });
        } else {
            window.open(shareLink, '_blank');
        }
    });

    function showError(message) {
        if (!loadingSection) {
            return;
        }
        resultsSection?.classList.add('hidden');
        loadingSection.classList.remove('hidden');
        if (spinnerElement) {
            spinnerElement.remove();
        }
        if (loadingTitle) {
            loadingTitle.textContent = 'Не удалось рассчитать результат';
        }
        if (loadingSubtitle) {
            loadingSubtitle.textContent = message;
            loadingSubtitle.classList.remove('muted');
            loadingSubtitle.classList.add('error');
        }
        if (!errorActionAdded) {
            const retryButton = document.createElement('button');
            retryButton.type = 'button';
            retryButton.className = 'btn btn-primary';
            retryButton.textContent = 'Пройти тест заново';
            retryButton.addEventListener('click', () => {
                localStorage.removeItem('kamalama_answers');
                window.location.href = 'welcome.html';
            });
            loadingSection.appendChild(retryButton);
            errorActionAdded = true;
        }
        if (shareButton) {
            shareButton.disabled = true;
            delete shareButton.dataset.expectancy;
        }
    }

    setTimeout(() => {
        try {
            const result = calculateLifeExpectancy(answers);
            if (!result || !Number.isFinite(result.expectancy)) {
                throw new Error('Некорректный результат расчёта');
            }

            expectancyElement.textContent = result.expectancy;
            deltaElement.textContent = formatDelta(result.deltaFromAge);

            if (shareButton) {
                shareButton.dataset.expectancy = String(result.expectancy);
                shareButton.disabled = false;
            }

            renderList(insightsList, result.highlights, 'highlight');
            renderList(recommendationsList, result.recommendations, 'recommendation');

            if (insightsCard) {
                insightsCard.classList.toggle('hidden', result.highlights.length === 0);
            }
            if (recommendationsCard) {
                recommendationsCard.classList.toggle('hidden', result.recommendations.length === 0);
            }

            renderMetrics(metricsList, result.metrics);

            loadingSection.classList.add('hidden');
            resultsSection.classList.remove('hidden');
        } catch (error) {
            console.error('Ошибка расчёта результатов', error);
            showError('Попробуйте пройти тест ещё раз — мы не смогли обработать ответы.');
        }
    }, 900);

    function renderList(container, items, baseClass) {
        if (!container) {
            return;
        }
        container.innerHTML = '';
        if (!items.length) {
            const empty = document.createElement('p');
            empty.className = 'muted';
            empty.textContent = 'Нет данных';
            container.appendChild(empty);
            return;
        }

        items.forEach((item) => {
            const element = document.createElement('div');
            element.className = 'recommendation';
            if (baseClass === 'highlight') {
                element.classList.add('highlight');
            }
            element.innerHTML = `<strong>${item.title}</strong><br>${item.description}`;
            container.appendChild(element);
        });
    }

    function renderMetrics(container, metrics) {
        if (!container) {
            return;
        }
        container.innerHTML = '';
        metrics.forEach((metric) => {
            const dt = document.createElement('dt');
            dt.textContent = metric.label;
            const dd = document.createElement('dd');
            dd.textContent = metric.value;
            container.appendChild(dt);
            container.appendChild(dd);
        });
    }

    function formatDelta(delta) {
        if (!Number.isFinite(delta)) {
            return '';
        }
        const absDelta = Math.abs(Math.round(delta));
        if (absDelta === 0) {
            return 'Ваш результат соответствует текущему возрасту.';
        }
        if (delta > 0) {
            return `Это на ${absDelta} ${plural(absDelta, ['год', 'года', 'лет'])} больше вашего текущего возраста.`;
        }
        return `Это на ${absDelta} ${plural(absDelta, ['год', 'года', 'лет'])} меньше вашего текущего возраста.`;
    }

    function plural(number, forms) {
        const n = Math.abs(number) % 100;
        const n1 = n % 10;
        if (n > 10 && n < 20) return forms[2];
        if (n1 > 1 && n1 < 5) return forms[1];
        if (n1 === 1) return forms[0];
        return forms[2];
    }
})();

function calculateLifeExpectancy(answers) {
    const getCountryExpectancy = window.LifeTestConfig?.getCountryExpectancy ?? (() => window.LifeTestConfig?.fallbackExpectancy ?? 72);
    const gender = answers.gender;
    const age = Number(answers.age) || 0;

    const baseCurrent = getCountryExpectancy(answers.country_current);
    const baseFuture = getCountryExpectancy(answers.country_future);
    let expectancy = baseCurrent * 0.4 + baseFuture * 0.6;

    if (gender === 'female') {
        expectancy += 3;
    }

    const highlights = [];
    const recommendations = [];

    const addHighlight = (title, description) => {
        highlights.push({ title, description });
    };

    const addRecommendation = (title, description) => {
        recommendations.push({ title, description });
    };

    const adjust = (delta, { highlight, recommendation } = {}) => {
        expectancy += delta;
        if (delta >= 0 && highlight) {
            addHighlight(highlight.title, highlight.description);
        }
        if (delta < 0 && recommendation) {
            addRecommendation(recommendation.title, recommendation.description);
        }
    };

    switch (answers.steps) {
        case '10001_more':
            adjust(3.5, {
                highlight: {
                    title: 'Высокая дневная активность',
                    description: '10 000+ шагов в день снижает риски сердечно-сосудистых заболеваний.'
                }
            });
            break;
        case '8001_10000':
            adjust(3, {
                highlight: {
                    title: 'Отличный уровень активности',
                    description: '8 000–10 000 шагов поддерживают метаболизм и здоровье сосудов.'
                }
            });
            break;
        case '6001_8000':
            adjust(2, {
                highlight: {
                    title: 'Хороший объём прогулок',
                    description: 'Сохраняйте привычку ежедневного движения.'
                }
            });
            break;
        case '4001_6000':
            adjust(0.5);
            break;
        case '2201_4000':
            adjust(-1, {
                recommendation: {
                    title: 'Добавьте движения в день',
                    description: 'Попробуйте увеличить ежедневный шагомер до 6 000–8 000 шагов.'
                }
            });
            break;
        case 'less_2200':
            adjust(-3, {
                recommendation: {
                    title: 'Критически мало шагов',
                    description: 'Регулярные прогулки снижают риски диабета и сердечных болезней.'
                }
            });
            break;
        case 'dont_know':
            adjust(-0.5, {
                recommendation: {
                    title: 'Начните отслеживать активность',
                    description: 'Фитнес-браслет или приложение помогут контролировать уровень движения.'
                }
            });
            break;
        default:
            break;
    }

    switch (answers.activity) {
        case '5_more_times':
            adjust(2.5, {
                highlight: {
                    title: 'Регулярные тренировки',
                    description: '5+ сессий активности в неделю укрепляют сердечно-сосудистую систему.'
                }
            });
            break;
        case '3_4_times':
            adjust(1.5, {
                highlight: {
                    title: 'Стабильный спорт',
                    description: '3–4 тренировки в неделю поддерживают силу и выносливость.'
                }
            });
            break;
        case '1_2_times':
            adjust(0.5);
            break;
        case 'rarely_never':
            adjust(-2.5, {
                recommendation: {
                    title: 'Добавьте регулярную активность',
                    description: 'Даже 150 минут умеренных нагрузок в неделю заметно улучшают здоровье.'
                }
            });
            break;
        default:
            break;
    }

    switch (answers.sleep) {
        case '7_8':
            adjust(2, {
                highlight: {
                    title: 'Здоровый сон',
                    description: '7–8 часов сна поддерживают гормональный баланс и восстановление.'
                }
            });
            break;
        case '5_6':
            adjust(0);
            break;
        case 'more_8':
            adjust(0.5);
            break;
        case 'less_5':
            adjust(-2.5, {
                recommendation: {
                    title: 'Улучшите режим сна',
                    description: 'Хронический недосып повышает давление и ухудшает метаболизм.'
                }
            });
            break;
        default:
            break;
    }

    switch (answers.smoking) {
        case 'never':
            adjust(4, {
                highlight: {
                    title: 'Отсутствие курения',
                    description: 'Некурящие живут в среднем на 10 лет дольше курильщиков.'
                }
            });
            break;
        case 'quit_10_plus':
            adjust(2, {
                highlight: {
                    title: 'Более 10 лет без табака',
                    description: 'Риски сердца почти вернулись к уровню некурящих.'
                }
            });
            break;
        case 'quit_5_10':
            adjust(-1, {
                recommendation: {
                    title: 'Продолжайте удерживать ремиссию',
                    description: 'Через 10 лет без сигарет риски почти исчезнут.'
                }
            });
            break;
        case 'quit_1_5':
            adjust(-2, {
                recommendation: {
                    title: 'Защитите результат отказа от курения',
                    description: 'Поддерживайте ремиссию и контролируйте здоровье лёгких.'
                }
            });
            break;
        case 'sometimes':
            adjust(-4, {
                recommendation: {
                    title: 'Снизьте частоту курения',
                    description: 'Даже редкие сигареты увеличивают риск инфаркта и инсульта.'
                }
            });
            break;
        case 'daily':
            adjust(-7, {
                recommendation: {
                    title: 'Пора бросить курить',
                    description: 'Ежедневное курение сокращает жизнь на 10–12 лет. Обратитесь за поддержкой.'
                }
            });
            break;
        default:
            break;
    }

    switch (answers.alcohol) {
        case 'rarely':
            adjust(1, {
                highlight: {
                    title: 'Минимальное употребление алкоголя',
                    description: 'Редкие или отсутствующие напитки снижают нагрузку на печень и сердце.'
                }
            });
            break;
        case 'few_month':
            adjust(0.5);
            break;
        case 'few_week':
            adjust(-1, {
                recommendation: {
                    title: 'Сократите еженедельный алкоголь',
                    description: 'Ограничьтесь 1–2 порциями в неделю, чтобы снизить риск гипертонии.'
                }
            });
            break;
        case '1_2_day':
            adjust(-2.5, {
                recommendation: {
                    title: 'План умеренного потребления',
                    description: 'Снизьте ежедневные порции алкоголя до редких случаев.'
                }
            });
            break;
        case '3_plus_day':
            adjust(-4, {
                recommendation: {
                    title: 'Пересмотрите потребление алкоголя',
                    description: 'Высокие дозы увеличивают риски рака печени и инсультов.'
                }
            });
            break;
        default:
            break;
    }

    switch (answers.seatbelt) {
        case 'always':
            adjust(1, {
                highlight: {
                    title: 'Привычка пристёгиваться',
                    description: 'Ремень безопасности снижает риск смертельной травмы на 45%. '
                }
            });
            break;
        case 'sometimes':
            adjust(-2, {
                recommendation: {
                    title: 'Пристёгивайтесь в каждой поездке',
                    description: 'Даже короткие поездки без ремня опасны при резком торможении.'
                }
            });
            break;
        case 'rarely':
            adjust(-4, {
                recommendation: {
                    title: 'Сделайте ремень привычкой',
                    description: 'Отсутствие ремня резко увеличивает смертность при ДТП.'
                }
            });
            break;
        default:
            break;
    }

    switch (answers.phone_driving) {
        case 'never':
            adjust(1, {
                highlight: {
                    title: 'Осознанное вождение',
                    description: 'Отказ от телефона за рулём снижает риск аварий.'
                }
            });
            break;
        case 'no_drive':
            adjust(0.5);
            break;
        case 'sometimes':
            adjust(-1, {
                recommendation: {
                    title: 'Избегайте отвлечений за рулём',
                    description: 'Используйте режим «Не беспокоить» или гарнитуру.'
                }
            });
            break;
        case 'often':
            adjust(-2, {
                recommendation: {
                    title: 'Телефон — вне рук во время вождения',
                    description: 'Набор текста за рулём в 23 раза повышает риск ДТП.'
                }
            });
            break;
        default:
            break;
    }

    if (answers.motorcycle === 'yes') {
        adjust(-2, {
            recommendation: {
                title: 'Максимальная защита при езде на мотоцикле',
                description: 'Шлем и экипировка обязательны, избегайте ночных поездок.'
            }
        });
    } else if (answers.motorcycle === 'no') {
        adjust(0.5);
    }

    switch (answers.social_hours) {
        case '15_plus':
            adjust(2, {
                highlight: {
                    title: 'Активные социальные связи',
                    description: 'Регулярное общение поддерживает когнитивное здоровье и настроение.'
                }
            });
            break;
        case '2_15':
            adjust(1, {
                highlight: {
                    title: 'Поддерживаете контакты',
                    description: 'Общение несколько раз в месяц снижает уровень стресса.'
                }
            });
            break;
        case 'lt_2':
            adjust(-2, {
                recommendation: {
                    title: 'Расширьте социальное взаимодействие',
                    description: 'Даже короткие встречи с близкими улучшают психическое здоровье.'
                }
            });
            break;
        default:
            break;
    }

    switch (answers.relationship_status) {
        case 'married':
            adjust(1, {
                highlight: {
                    title: 'Стабильное партнёрство',
                    description: 'Брак с хорошей поддержкой связан с более долгой жизнью.'
                }
            });
            break;
        case 'relationship':
            adjust(0.5);
            break;
        case 'divorced':
        case 'widowed':
            adjust(-0.5, {
                recommendation: {
                    title: 'Заботьтесь о системе поддержки',
                    description: 'Общение с близкими и психологом помогает справляться со стрессом.'
                }
            });
            break;
        default:
            break;
    }

    const satisfaction = Number(answers.relationship_satisfaction);
    if (satisfaction >= 4) {
        adjust(0.7, {
            highlight: {
                title: 'Высокая удовлетворённость отношениями',
                description: 'Позитивные отношения снижают уровень хронического стресса.'
            }
        });
    } else if (satisfaction === 3) {
        adjust(0.2);
    } else if (satisfaction === 2) {
        adjust(-0.5, {
            recommendation: {
                title: 'Обратите внимание на эмоциональный комфорт',
                description: 'Обсудите ожидания или обратитесь к специалисту по семейным отношениям.'
            }
        });
    } else if (satisfaction === 1) {
        adjust(-1.5, {
            recommendation: {
                title: 'Поддержка эмоционального состояния',
                description: 'Низкая удовлетворённость увеличивает риск депрессии и заболеваний.'
            }
        });
    }

    const stress = Number(answers.stress);
    if (stress === 1) {
        adjust(1.5, {
            highlight: {
                title: 'Контролируемый уровень стресса',
                description: 'Низкий стресс защищает сердечно-сосудистую систему.'
            }
        });
    } else if (stress === 2) {
        adjust(0.7);
    } else if (stress === 4) {
        adjust(-1, {
            recommendation: {
                title: 'Снизьте хронический стресс',
                description: 'Включите дыхательные практики, сон и отдых в расписание.'
            }
        });
    } else if (stress === 5) {
        adjust(-2.5, {
            recommendation: {
                title: 'Стресс на критическом уровне',
                description: 'Психолог или коуч поможет выстроить стратегии управления нагрузкой.'
            }
        });
    }

    const happiness = Number(answers.happiness);
    if (happiness === 5) {
        adjust(1, {
            highlight: {
                title: 'Высокий уровень счастья',
                description: 'Оптимизм связан с более низким риском преждевременной смерти.'
            }
        });
    } else if (happiness === 4) {
        adjust(0.5);
    } else if (happiness === 2) {
        adjust(-1, {
            recommendation: {
                title: 'Поддерживайте эмоциональное благополучие',
                description: 'Ищите занятия, которые приносят радость, и делитесь ими с близкими.'
            }
        });
    } else if (happiness === 1) {
        adjust(-2, {
            recommendation: {
                title: 'Работайте над ощущением счастья',
                description: 'Разговор с психологом поможет найти источники удовлетворённости.'
            }
        });
    }

    const bmiAnswer = answers.bmi;
    let bmiCategory = null;
    let bmiValue = null;
    if (bmiAnswer) {
        if (typeof bmiAnswer === 'object') {
            bmiCategory = bmiAnswer.category ?? null;
            bmiValue = bmiAnswer.bmi ?? null;
        } else {
            bmiCategory = bmiAnswer;
        }
    }

    switch (bmiCategory) {
        case 'normal':
            adjust(2, {
                highlight: {
                    title: 'ИМТ в целевом диапазоне',
                    description: 'Сбалансированный вес снижает нагрузку на сердце и суставы.'
                }
            });
            break;
        case 'underweight':
            adjust(-1.5, {
                recommendation: {
                    title: 'Наберите здоровый вес',
                    description: 'Недостаток массы повышает риски остеопороза и ослабляет иммунитет.'
                }
            });
            break;
        case 'overweight':
            adjust(-2, {
                recommendation: {
                    title: 'Управляйте весом',
                    description: 'Похудение на 5–7% уже снижает вероятность диабета 2 типа.'
                }
            });
            break;
        case 'obesity':
            adjust(-5, {
                recommendation: {
                    title: 'Работа с ИМТ выше 30',
                    description: 'Комплекс питания, активности и медицинского контроля снизит риски ССЗ.'
                }
            });
            break;
        default:
            break;
    }

    switch (answers.cvd_history) {
        case 'none':
            adjust(1, {
                highlight: {
                    title: 'Нет сердечно-сосудистых событий',
                    description: 'Продолжайте регулярные обследования, чтобы сохранить результат.'
                }
            });
            break;
        case 'single':
            adjust(-2, {
                recommendation: {
                    title: 'Контроль после сердечного события',
                    description: 'Следуйте плану врача и придерживайтесь кардио-реабилитации.'
                }
            });
            break;
        case 'multiple':
            adjust(-4, {
                recommendation: {
                    title: 'Регулярно наблюдайтесь у кардиолога',
                    description: 'Комплексная терапия поможет стабилизировать состояние.'
                }
            });
            break;
        default:
            break;
    }

    const longLived = Number(answers.long_lived_relatives);
    if (Number.isFinite(longLived)) {
        const longevityBonus = [-1, -0.5, 0, 0.5, 1, 1.5, 2][longLived] ?? 0;
        if (longevityBonus > 0) {
            adjust(longevityBonus, {
                highlight: {
                    title: 'Семейная история долгожителей',
                    description: 'Генетика поддерживает высокую вероятность долгой жизни.'
                }
            });
        } else if (longevityBonus < 0) {
            adjust(longevityBonus, {
                recommendation: {
                    title: 'Компенсируйте генетические факторы',
                    description: 'Фокус на питании, активности и профилактике компенсирует слабую наследственность.'
                }
            });
        }
    }

    const familyConditions = Number(answers.family_conditions);
    if (Number.isFinite(familyConditions)) {
        const riskPenalty = [1, 0.5, 0, -0.5, -1, -1.5, -2][familyConditions] ?? 0;
        if (riskPenalty > 0) {
            adjust(riskPenalty, {
                highlight: {
                    title: 'Минимальные семейные заболевания',
                    description: 'Семейная история без ССЗ, диабета и рака — сильный плюс.'
                }
            });
        } else if (riskPenalty < 0) {
            adjust(riskPenalty, {
                recommendation: {
                    title: 'Повышенные семейные риски',
                    description: 'Обсудите с врачом раннюю диагностику и регулярные скрининги.'
                }
            });
        }
    }

    if (age > 0) {
        expectancy = Math.max(expectancy, age + 2);
    }

    expectancy = Math.min(expectancy, 105);
    const roundedExpectancy = Math.round(expectancy);
    const deltaFromAge = roundedExpectancy - age;

    const metrics = buildMetrics(answers, { bmiCategory, bmiValue, roundedExpectancy });

    return {
        expectancy: roundedExpectancy,
        deltaFromAge,
        highlights,
        recommendations,
        metrics
    };
}

function buildMetrics(answers, context) {
    const metrics = [];
    if (answers.age) {
        metrics.push({ label: 'Возраст', value: `${answers.age} лет` });
    }
    if (answers.gender) {
        metrics.push({ label: 'Пол', value: answers.gender === 'female' ? 'Женский' : 'Мужской' });
    }
    if (context.bmiCategory) {
        const categoryNames = {
            underweight: 'Недостаточный',
            normal: 'Нормальный',
            overweight: 'Избыточный',
            obesity: 'Ожирение'
        };
        const bmiText = context.bmiValue ? `${context.bmiValue} (${categoryNames[context.bmiCategory]})` : categoryNames[context.bmiCategory];
        metrics.push({ label: 'Индекс массы тела', value: bmiText });
    }
    if (answers.steps) {
        const stepsMap = {
            less_2200: 'Менее 2 200 шагов',
            2201_4000: '2 201–4 000 шагов',
            4001_6000: '4 001–6 000 шагов',
            6001_8000: '6 001–8 000 шагов',
            8001_10000: '8 001–10 000 шагов',
            10001_more: '10 001+ шагов',
            dont_know: 'Не отслеживает'
        };
        metrics.push({ label: 'Ежедневная активность', value: stepsMap[answers.steps] ?? '—' });
    }
    if (answers.country_current) {
        metrics.push({ label: 'Страна сейчас', value: answers.country_current });
    }
    if (answers.country_future) {
        metrics.push({ label: 'Страна через 10 лет', value: answers.country_future });
    }
    if (answers.cvd_history) {
        const historyMap = {
            none: 'Не было событий',
            single: '1 событие',
            multiple: 'Несколько событий'
        };
        metrics.push({ label: 'История ССЗ', value: historyMap[answers.cvd_history] ?? '—' });
    }
    if (Number.isFinite(Number(answers.long_lived_relatives))) {
        metrics.push({ label: 'Долгожители в семье', value: `${answers.long_lived_relatives}` });
    }
    if (Number.isFinite(Number(answers.family_conditions))) {
        metrics.push({ label: 'Семейные хронические заболевания', value: `${answers.family_conditions}` });
    }
    return metrics;
}
