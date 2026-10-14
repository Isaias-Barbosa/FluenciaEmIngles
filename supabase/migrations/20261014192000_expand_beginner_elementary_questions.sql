insert into public.lessons (
  level_id, slug, title, description, category, duration_minutes, sort_order, is_published
)
select levels.id, lesson.slug, lesson.title, lesson.description, lesson.category,
  lesson.duration_minutes, lesson.sort_order, true
from public.language_levels as levels
join public.languages on languages.id = levels.language_id
join (
  values
    ('a1-articles-objects', 'A1', 'Objetos e artigos', 'Identifique objetos do cotidiano e pratique a, an e the.', 'Gramática', 10, 5),
    ('a1-family', 'A1', 'Família e pessoas', 'Apresente familiares e descreva as pessoas próximas a você.', 'Vocabulário', 10, 6),
    ('a1-food', 'A1', 'Comidas do dia a dia', 'Fale sobre alimentos, bebidas e preferências simples.', 'Vocabulário', 10, 7),
    ('a1-home', 'A1', 'Minha casa', 'Conheça os cômodos e diga onde as coisas estão.', 'Vocabulário', 11, 8),
    ('a1-time', 'A1', 'Dias, horas e rotina', 'Pergunte as horas e fale sobre os dias da semana.', 'Conversação', 10, 9),
    ('a1-places', 'A1', 'Lugares da cidade', 'Reconheça lugares comuns e peça informação básica.', 'Vocabulário', 11, 10),
    ('a2-shopping', 'A2', 'Compras e preços', 'Pergunte preços, tamanhos e quantidades em uma loja.', 'Conversação', 12, 4),
    ('a2-city', 'A2', 'Como chegar a algum lugar', 'Peça e entenda instruções para se locomover pela cidade.', 'Conversação', 12, 5),
    ('a2-routines', 'A2', 'Hábitos e frequência', 'Fale sobre hábitos usando advérbios de frequência.', 'Gramática', 11, 6),
    ('a2-food-quantities', 'A2', 'Comida e quantidades', 'Descreva ingredientes e quantidades usando much, many e a few.', 'Vocabulário', 12, 7),
    ('a2-comparisons', 'A2', 'Compare pessoas e lugares', 'Compare opções, experiências e lugares com clareza.', 'Gramática', 11, 8),
    ('a2-invitations', 'A2', 'Convites e combinações', 'Convide alguém, aceite ou recuse com educação.', 'Conversação', 11, 9),
    ('a2-travel', 'A2', 'Viagens e transporte', 'Compre bilhetes e pergunte sobre horários e destinos.', 'Vocabulário', 12, 10),
    ('a2-health', 'A2', 'Na farmácia e no consultório', 'Explique sintomas comuns e peça ajuda básica.', 'Conversação', 12, 11),
    ('a2-messages', 'A2', 'Ligações e mensagens', 'Deixe um recado curto e combine um horário por telefone.', 'Conversação', 11, 12),
    ('a2-work', 'A2', 'Pedidos no trabalho', 'Faça pedidos educados e fale sobre tarefas do dia a dia.', 'Conversação', 12, 13),
    ('a2-now', 'A2', 'O que está acontecendo agora?', 'Descreva ações em andamento usando present continuous.', 'Gramática', 11, 14),
    ('a2-hotel', 'A2', 'Hospedagem e planos', 'Faça check-in e resolva necessidades simples durante uma viagem.', 'Conversação', 12, 15)
) as lesson(slug, level_code, title, description, category, duration_minutes, sort_order)
  on lesson.level_code = levels.code
where languages.code = 'en'
on conflict (slug) do update set
  level_id = excluded.level_id,
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  duration_minutes = excluded.duration_minutes,
  sort_order = excluded.sort_order,
  is_published = true;

with question_data (
  lesson_slug,
  question_order,
  question_type,
  prompt,
  choices,
  correct_answer,
  audio_path
) as (
  values
    ('a1-introductions', 1, 'multiple_choice', 'Como você diz “Meu nome é Ana” em inglês?', '["I am name Ana.","My name is Ana.","I name Ana."]'::jsonb, 'My name is Ana.', null),
    ('a1-introductions', 2, 'multiple_choice', 'Qual resposta significa “Prazer em conhecer você”?', '["Nice to meet you.","See you yesterday.","I am very well."]'::jsonb, 'Nice to meet you.', null),
    ('a1-introductions', 3, 'fill_blank', 'Complete a saudação: “Good ___, Maria!” (encontro pela manhã)', '[]'::jsonb, 'morning', null),
    ('a1-introductions', 4, 'multiple_choice', 'Alguém pergunta “How are you?”. Qual resposta é natural?', '["I am fine, thank you.","I am 25 years.","My name is fine."]'::jsonb, 'I am fine, thank you.', null),
    ('a1-introductions', 5, 'listening', 'Ouça e digite a frase que você ouviu.', '[]'::jsonb, 'Hello, my name is Anna.', 'public/audio/a1-introductions.wav'),

    ('a1-to-be', 1, 'multiple_choice', 'Complete: “They ___ happy.”', '["is","am","are"]'::jsonb, 'are', null),
    ('a1-to-be', 2, 'multiple_choice', 'Complete: “I ___ from Brazil.”', '["is","am","are"]'::jsonb, 'am', null),
    ('a1-to-be', 3, 'fill_blank', 'Complete: “She ___ my friend.”', '[]'::jsonb, 'is', null),
    ('a1-to-be', 4, 'multiple_choice', 'Qual é a forma negativa de “He is tired”?', '["He not is tired.","He is not tired.","He are not tired."]'::jsonb, 'He is not tired.', null),
    ('a1-to-be', 5, 'listening', 'Ouça e digite a frase que você ouviu.', '[]'::jsonb, 'We are ready.', 'public/audio/a1-to-be.wav'),

    ('a1-age', 1, 'multiple_choice', 'Qual frase significa “Eu tenho 20 anos”?', '["I have 20 years old.","I am 20 years old.","I has 20."]'::jsonb, 'I am 20 years old.', null),
    ('a1-age', 2, 'multiple_choice', 'Qual número vem depois de fourteen?', '["Thirteen","Fifteen","Forty"]'::jsonb, 'Fifteen', null),
    ('a1-age', 3, 'fill_blank', 'Escreva por extenso o número 12 em inglês.', '[]'::jsonb, 'twelve', null),
    ('a1-age', 4, 'multiple_choice', 'Complete: “How old ___ your brother?”', '["am","is","are"]'::jsonb, 'is', null),
    ('a1-age', 5, 'listening', 'Ouça e digite a frase que você ouviu.', '[]'::jsonb, 'I am twenty years old.', 'public/audio/a1-age.wav'),

    ('a1-routine', 1, 'multiple_choice', 'Complete: “I ___ coffee every morning.”', '["drink","drinks","drinking"]'::jsonb, 'drink', null),
    ('a1-routine', 2, 'multiple_choice', 'Qual frase diz “Eu acordo às sete”?', '["I wake up at seven.","I stand up seven.","I sleep at seven morning."]'::jsonb, 'I wake up at seven.', null),
    ('a1-routine', 3, 'fill_blank', 'Complete: “I ___ to work by bus.”', '[]'::jsonb, 'go', null),
    ('a1-routine', 4, 'multiple_choice', 'Complete: “She ___ English at night.”', '["study","studies","studying"]'::jsonb, 'studies', null),
    ('a1-routine', 5, 'listening', 'Ouça e digite a frase que você ouviu.', '[]'::jsonb, 'I work every day.', 'public/audio/a1-routine.wav'),

    ('a1-articles-objects', 1, 'multiple_choice', 'Escolha o artigo correto: “I have ___ apple.”', '["a","an","the"]'::jsonb, 'an', null),
    ('a1-articles-objects', 2, 'fill_blank', 'Complete: “This is ___ book.” (um livro, qualquer livro)', '[]'::jsonb, 'a', null),
    ('a1-articles-objects', 3, 'multiple_choice', 'Qual objeto você usa para escrever?', '["A pen","A chair","A plate"]'::jsonb, 'A pen', null),
    ('a1-articles-objects', 4, 'multiple_choice', 'Complete: “___ sun is bright today.”', '["A","An","The"]'::jsonb, 'The', null),
    ('a1-articles-objects', 5, 'listening', 'Ouça e digite a frase que você ouviu.', '[]'::jsonb, 'This is an orange.', 'public/audio/a1-articles-objects.wav'),

    ('a1-family', 1, 'multiple_choice', '“Mother” significa:', '["Mãe","Irmã","Filha"]'::jsonb, 'Mãe', null),
    ('a1-family', 2, 'fill_blank', 'Complete: “My father and my mother are my ___.”', '[]'::jsonb, 'parents', null),
    ('a1-family', 3, 'multiple_choice', 'A filha dos seus pais é sua:', '["Aunt","Sister","Grandmother"]'::jsonb, 'Sister', null),
    ('a1-family', 4, 'multiple_choice', 'Complete: “He is ___ brother.”', '["I","my","me"]'::jsonb, 'my', null),
    ('a1-family', 5, 'listening', 'Ouça e digite a frase que você ouviu.', '[]'::jsonb, 'My sister is kind.', 'public/audio/a1-family.wav'),

    ('a1-food', 1, 'multiple_choice', 'Qual palavra significa “água”?', '["Bread","Water","Rice"]'::jsonb, 'Water', null),
    ('a1-food', 2, 'fill_blank', 'Complete: “I eat ___ for breakfast.” (pão)', '[]'::jsonb, 'bread', null),
    ('a1-food', 3, 'multiple_choice', 'Qual destes é uma fruta?', '["Carrot","Chicken","Banana"]'::jsonb, 'Banana', null),
    ('a1-food', 4, 'multiple_choice', 'Complete: “I ___ tea.”', '["like","likes","liking"]'::jsonb, 'like', null),
    ('a1-food', 5, 'listening', 'Ouça e digite a frase que você ouviu.', '[]'::jsonb, 'I like rice and beans.', 'public/audio/a1-food.wav'),

    ('a1-home', 1, 'multiple_choice', 'Em qual cômodo você normalmente dorme?', '["Kitchen","Bedroom","Bathroom"]'::jsonb, 'Bedroom', null),
    ('a1-home', 2, 'fill_blank', 'Complete: “The book is ___ the table.” (sobre)', '[]'::jsonb, 'on', null),
    ('a1-home', 3, 'multiple_choice', '“Kitchen” significa:', '["Quarto","Cozinha","Jardim"]'::jsonb, 'Cozinha', null),
    ('a1-home', 4, 'multiple_choice', 'Complete: “There ___ two chairs in the room.”', '["is","are","am"]'::jsonb, 'are', null),
    ('a1-home', 5, 'listening', 'Ouça e digite a frase que você ouviu.', '[]'::jsonb, 'The keys are in my bag.', 'public/audio/a1-home.wav'),

    ('a1-time', 1, 'multiple_choice', 'Qual dia vem depois de Monday?', '["Sunday","Tuesday","Friday"]'::jsonb, 'Tuesday', null),
    ('a1-time', 2, 'fill_blank', 'Complete: “I go to bed at ___ o’clock.” (10)', '[]'::jsonb, 'ten', null),
    ('a1-time', 3, 'multiple_choice', '“What time is it?” pergunta:', '["Que dia é hoje?","Que horas são?","Onde você mora?"]'::jsonb, 'Que horas são?', null),
    ('a1-time', 4, 'multiple_choice', 'Complete: “I have lunch ___ noon.”', '["at","on","in"]'::jsonb, 'at', null),
    ('a1-time', 5, 'listening', 'Ouça e digite a frase que você ouviu.', '[]'::jsonb, 'Today is Monday.', 'public/audio/a1-time.wav'),

    ('a1-places', 1, 'multiple_choice', 'Onde você pode pegar um ônibus?', '["At a bus stop","At a bedroom","At a kitchen"]'::jsonb, 'At a bus stop', null),
    ('a1-places', 2, 'fill_blank', 'Complete: “I buy food at the ___.” (supermercado)', '[]'::jsonb, 'supermarket', null),
    ('a1-places', 3, 'multiple_choice', '“Hospital” é um lugar para:', '["Assistir a um filme","Receber cuidados médicos","Comprar roupas"]'::jsonb, 'Receber cuidados médicos', null),
    ('a1-places', 4, 'multiple_choice', 'Complete: “The bank is ___ the school.” (ao lado)', '["next to","under","between"]'::jsonb, 'next to', null),
    ('a1-places', 5, 'listening', 'Ouça e digite a frase que você ouviu.', '[]'::jsonb, 'The park is near the school.', 'public/audio/a1-places.wav'),

    ('a2-past', 1, 'multiple_choice', 'Complete: “We ___ a movie last night.”', '["watch","watched","watches"]'::jsonb, 'watched', null),
    ('a2-past', 2, 'fill_blank', 'Escreva o passado de “visit”. “They ___ their friends yesterday.”', '[]'::jsonb, 'visited', null),
    ('a2-past', 3, 'multiple_choice', 'Qual é o passado de “go”?', '["Goed","Went","Gone"]'::jsonb, 'Went', null),
    ('a2-past', 4, 'multiple_choice', 'Complete: “She ___ breakfast before work.”', '["have","had","has"]'::jsonb, 'had', null),
    ('a2-past', 5, 'listening', 'Ouça e digite a frase que você ouviu.', '[]'::jsonb, 'We visited our friends yesterday.', 'public/audio/a2-past.wav'),

    ('a2-restaurant', 1, 'multiple_choice', 'Qual é uma forma educada de pedir água?', '["Water now!","Can I have some water, please?","Give water to me."]'::jsonb, 'Can I have some water, please?', null),
    ('a2-restaurant', 2, 'multiple_choice', 'O que você pede no final da refeição?', '["The bill, please.","A map, please.","A ticket, please."]'::jsonb, 'The bill, please.', null),
    ('a2-restaurant', 3, 'fill_blank', 'Complete o pedido: “I would ___ the chicken, please.”', '[]'::jsonb, 'like', null),
    ('a2-restaurant', 4, 'multiple_choice', 'O garçom pergunta “Anything else?”. Você ainda quer café:', '["No, thank you.","I am coffee.","Yes, a coffee, please."]'::jsonb, 'Yes, a coffee, please.', null),
    ('a2-restaurant', 5, 'listening', 'Ouça e digite o pedido que você ouviu.', '[]'::jsonb, 'Could I have a menu please?', 'public/audio/a2-restaurant.wav'),

    ('a2-future', 1, 'multiple_choice', 'Complete: “She is ___ visit London.”', '["going to","go to","will to"]'::jsonb, 'going to', null),
    ('a2-future', 2, 'fill_blank', 'Complete: “I am going ___ study tonight.”', '[]'::jsonb, 'to', null),
    ('a2-future', 3, 'multiple_choice', 'Qual frase fala de um plano para amanhã?', '["I visited my aunt yesterday.","I am going to call my aunt tomorrow.","I call my aunt every day."]'::jsonb, 'I am going to call my aunt tomorrow.', null),
    ('a2-future', 4, 'multiple_choice', 'Complete: “They ___ going to travel in July.”', '["is","are","am"]'::jsonb, 'are', null),
    ('a2-future', 5, 'listening', 'Ouça e digite o plano que você ouviu.', '[]'::jsonb, 'We are going to travel next week.', 'public/audio/a2-future.wav'),

    ('a2-shopping', 1, 'multiple_choice', 'Como perguntar o preço de uma camisa?', '["How much is this shirt?","How old is this shirt?","How many is this shirt?"]'::jsonb, 'How much is this shirt?', null),
    ('a2-shopping', 2, 'fill_blank', 'Complete: “Do you have this in a larger ___?”', '[]'::jsonb, 'size', null),
    ('a2-shopping', 3, 'multiple_choice', 'Uma calça custa 20 dólares e uma blusa custa 15. Quanto custam juntas?', '["Thirty-five dollars","Twenty-five dollars","Forty-five dollars"]'::jsonb, 'Thirty-five dollars', null),
    ('a2-shopping', 4, 'multiple_choice', 'Qual frase indica que você só está olhando?', '["I am just looking, thank you.","I look you later.","I am seeing only."]'::jsonb, 'I am just looking, thank you.', null),
    ('a2-shopping', 5, 'listening', 'Ouça e digite a pergunta sobre o preço.', '[]'::jsonb, 'How much is this jacket?', 'public/audio/a2-shopping.wav'),

    ('a2-city', 1, 'multiple_choice', 'Complete: “Go straight and turn ___ at the bank.”', '["left","late","long"]'::jsonb, 'left', null),
    ('a2-city', 2, 'fill_blank', 'Complete: “The museum is ___ the library and the café.”', '[]'::jsonb, 'between', null),
    ('a2-city', 3, 'multiple_choice', 'Qual pergunta pede direções?', '["How do I get to the station?","How much is the station?","What time is the station?"]'::jsonb, 'How do I get to the station?', null),
    ('a2-city', 4, 'multiple_choice', '“Turn right at the traffic lights” significa:', '["Vire à direita no semáforo.","Atravesse a ponte.","Siga até a estação."]'::jsonb, 'Vire à direita no semáforo.', null),
    ('a2-city', 5, 'listening', 'Ouça e digite a instrução que você ouviu.', '[]'::jsonb, 'Turn left at the next street.', 'public/audio/a2-city.wav'),

    ('a2-routines', 1, 'multiple_choice', 'Qual advérbio significa “sempre”?', '["Never","Always","Sometimes"]'::jsonb, 'Always', null),
    ('a2-routines', 2, 'fill_blank', 'Complete: “I ___ go to bed late; only on weekends.”', '[]'::jsonb, 'sometimes', null),
    ('a2-routines', 3, 'multiple_choice', 'Complete: “She ___ eats breakfast before work.”', '["usually","usual","use"]'::jsonb, 'usually', null),
    ('a2-routines', 4, 'multiple_choice', 'Qual advérbio significa “nunca”?', '["Often","Always","Never"]'::jsonb, 'Never', null),
    ('a2-routines', 5, 'listening', 'Ouça e digite a frase que você ouviu.', '[]'::jsonb, 'He usually walks to work.', 'public/audio/a2-routines.wav'),

    ('a2-food-quantities', 1, 'multiple_choice', 'Qual opção completa a frase: “How ___ apples do we need?”', '["much","many","any"]'::jsonb, 'many', null),
    ('a2-food-quantities', 2, 'fill_blank', 'Complete: “There is a ___ of milk in the fridge.”', '[]'::jsonb, 'bottle', null),
    ('a2-food-quantities', 3, 'multiple_choice', 'Qual frase usa “much” corretamente?', '["How much rice do you want?","How much apples do you want?","How many water do you want?"]'::jsonb, 'How much rice do you want?', null),
    ('a2-food-quantities', 4, 'multiple_choice', '“A few” é usado normalmente com:', '["Substantivos contáveis no plural","Substantivos incontáveis","Verbos no passado"]'::jsonb, 'Substantivos contáveis no plural', null),
    ('a2-food-quantities', 5, 'listening', 'Ouça e digite o ingrediente que você ouviu.', '[]'::jsonb, 'We need two eggs and some flour.', 'public/audio/a2-food-quantities.wav'),

    ('a2-comparisons', 1, 'multiple_choice', 'Complete: “This bag is ___ than that one.”', '["cheap","cheaper","cheapest"]'::jsonb, 'cheaper', null),
    ('a2-comparisons', 2, 'fill_blank', 'Complete: “My sister is ___ than me.” (mais alta)', '[]'::jsonb, 'taller', null),
    ('a2-comparisons', 3, 'multiple_choice', 'Qual é o superlativo de “small”?', '["Smaller","The smallest","More small"]'::jsonb, 'The smallest', null),
    ('a2-comparisons', 4, 'multiple_choice', 'Complete: “The train is ___ than the bus.”', '["fast","faster","fastest"]'::jsonb, 'faster', null),
    ('a2-comparisons', 5, 'listening', 'Ouça e digite a comparação que você ouviu.', '[]'::jsonb, 'The blue car is faster than the red car.', 'public/audio/a2-comparisons.wav'),

    ('a2-invitations', 1, 'multiple_choice', 'Como convidar alguém para tomar café?', '["Would you like to have coffee?","You like coffee yesterday?","You are coffee with me?"]'::jsonb, 'Would you like to have coffee?', null),
    ('a2-invitations', 2, 'fill_blank', 'Complete: “That sounds great! I would ___ to come.”', '[]'::jsonb, 'love', null),
    ('a2-invitations', 3, 'multiple_choice', 'Qual é uma forma educada de recusar um convite?', '["No. Never.","I am sorry, I cannot make it tonight.","I don’t invite you."]'::jsonb, 'I am sorry, I cannot make it tonight.', null),
    ('a2-invitations', 4, 'multiple_choice', 'Complete: “Are you free ___ Saturday?”', '["in","on","at"]'::jsonb, 'on', null),
    ('a2-invitations', 5, 'listening', 'Ouça e digite o convite que você ouviu.', '[]'::jsonb, 'Would you like to join us for dinner?', 'public/audio/a2-invitations.wav'),

    ('a2-travel', 1, 'multiple_choice', 'Onde você pode consultar o horário do trem?', '["On the timetable","In the recipe","At the mirror"]'::jsonb, 'On the timetable', null),
    ('a2-travel', 2, 'fill_blank', 'Complete: “I need a ___ ticket to Oxford.” (ida e volta)', '[]'::jsonb, 'return', null),
    ('a2-travel', 3, 'multiple_choice', 'O que significa “platform” em uma estação?', '["Plataforma","Passaporte","Bagagem"]'::jsonb, 'Plataforma', null),
    ('a2-travel', 4, 'multiple_choice', 'Complete: “The train leaves ___ 8:30.”', '["at","on","in"]'::jsonb, 'at', null),
    ('a2-travel', 5, 'listening', 'Ouça e digite o destino que você ouviu.', '[]'::jsonb, 'The train to Oxford leaves at nine.', 'public/audio/a2-travel.wav'),

    ('a2-health', 1, 'multiple_choice', 'Qual frase explica uma dor de cabeça?', '["I have a headache.","I am a headache.","My head has a doctor."]'::jsonb, 'I have a headache.', null),
    ('a2-health', 2, 'fill_blank', 'Complete: “You should ___ some water.”', '[]'::jsonb, 'drink', null),
    ('a2-health', 3, 'multiple_choice', 'Onde você compra remédios?', '["At a pharmacy","At a bakery","At a library"]'::jsonb, 'At a pharmacy', null),
    ('a2-health', 4, 'multiple_choice', 'O médico pergunta “How long have you felt this way?”. Ele quer saber:', '["Há quanto tempo você se sente assim.","Onde você mora.","Que remédio você prefere."]'::jsonb, 'Há quanto tempo você se sente assim.', null),
    ('a2-health', 5, 'listening', 'Ouça e digite o sintoma que você ouviu.', '[]'::jsonb, 'I have a sore throat.', 'public/audio/a2-health.wav'),

    ('a2-messages', 1, 'multiple_choice', 'Qual frase pede para alguém ligar mais tarde?', '["Please call me back later.","Please talk me yesterday.","Please phone to later."]'::jsonb, 'Please call me back later.', null),
    ('a2-messages', 2, 'fill_blank', 'Complete: “Can I ___ a message?”', '[]'::jsonb, 'leave', null),
    ('a2-messages', 3, 'multiple_choice', 'Qual é uma forma natural de perguntar se alguém pode falar?', '["Is this a good time to talk?","Are you time for talk?","Do you time now?"]'::jsonb, 'Is this a good time to talk?', null),
    ('a2-messages', 4, 'multiple_choice', 'Complete: “I will call you ___.” (mais tarde hoje)', '["later","late","latest"]'::jsonb, 'later', null),
    ('a2-messages', 5, 'listening', 'Ouça e digite o recado que você ouviu.', '[]'::jsonb, 'Please call me after six.', 'public/audio/a2-messages.wav'),

    ('a2-work', 1, 'multiple_choice', 'Qual pedido é mais educado?', '["Can you help me with this, please?","Help me this now.","You help this."]'::jsonb, 'Can you help me with this, please?', null),
    ('a2-work', 2, 'fill_blank', 'Complete: “Could you ___ the report by Friday?”', '[]'::jsonb, 'finish', null),
    ('a2-work', 3, 'multiple_choice', 'Complete: “I have to ___ a meeting at ten.”', '["attend","attends","attending"]'::jsonb, 'attend', null),
    ('a2-work', 4, 'multiple_choice', 'O que “Could you repeat that?” significa?', '["Você poderia repetir isso?","Você poderia assinar isso?","Você poderia enviar isso?"]'::jsonb, 'Você poderia repetir isso?', null),
    ('a2-work', 5, 'listening', 'Ouça e digite o pedido que você ouviu.', '[]'::jsonb, 'Could you send me the file please?', 'public/audio/a2-work.wav'),

    ('a2-now', 1, 'multiple_choice', 'Complete: “She ___ reading a book now.”', '["is","are","am"]'::jsonb, 'is', null),
    ('a2-now', 2, 'fill_blank', 'Complete: “They are ___ football in the park.”', '[]'::jsonb, 'playing', null),
    ('a2-now', 3, 'multiple_choice', 'Qual frase descreve algo acontecendo neste momento?', '["He works every Monday.","He is cooking dinner now.","He cooked dinner yesterday."]'::jsonb, 'He is cooking dinner now.', null),
    ('a2-now', 4, 'multiple_choice', 'Complete: “I ___ waiting for the bus.”', '["is","are","am"]'::jsonb, 'am', null),
    ('a2-now', 5, 'listening', 'Ouça e digite a frase que você ouviu.', '[]'::jsonb, 'The children are playing outside.', 'public/audio/a2-now.wav'),

    ('a2-hotel', 1, 'multiple_choice', 'O que você diz ao chegar para se hospedar?', '["I have a reservation.","I have a recipe.","I have a direction."]'::jsonb, 'I have a reservation.', null),
    ('a2-hotel', 2, 'fill_blank', 'Complete: “What time is ___ out?” (horário de saída do hotel)', '[]'::jsonb, 'check', null),
    ('a2-hotel', 3, 'multiple_choice', 'Como pedir uma toalha extra?', '["Could I have another towel, please?","Can I towel another?","I have another room."]'::jsonb, 'Could I have another towel, please?', null),
    ('a2-hotel', 4, 'multiple_choice', 'A recepcionista diz “Your room is on the third floor.” Onde fica o quarto?', '["No terceiro andar","No térreo","No segundo andar"]'::jsonb, 'No terceiro andar', null),
    ('a2-hotel', 5, 'listening', 'Ouça e digite a pergunta que você ouviu.', '[]'::jsonb, 'Is breakfast included in the price?', 'public/audio/a2-hotel.wav')
),
resolved_questions as (
  select
    lessons.id as lesson_id,
    question_data.question_order,
    question_data.question_type,
    question_data.prompt,
    question_data.choices,
    question_data.correct_answer,
    question_data.audio_path
  from question_data
  join public.lessons on lessons.slug = question_data.lesson_slug
)
insert into public.questions (
  lesson_id, question_type, prompt, choices, audio_path, sort_order, is_published
)
select lesson_id, question_type, prompt, choices, audio_path, question_order, true
from resolved_questions
on conflict (lesson_id, sort_order) do update set
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  choices = excluded.choices,
  audio_path = excluded.audio_path,
  is_published = true;

with question_data (lesson_slug, question_order, correct_answer) as (
  values
    ('a1-introductions', 1, 'My name is Ana.'),
    ('a1-introductions', 2, 'Nice to meet you.'),
    ('a1-introductions', 3, 'morning'),
    ('a1-introductions', 4, 'I am fine, thank you.'),
    ('a1-introductions', 5, 'Hello, my name is Anna.'),
    ('a1-to-be', 1, 'are'),
    ('a1-to-be', 2, 'am'),
    ('a1-to-be', 3, 'is'),
    ('a1-to-be', 4, 'He is not tired.'),
    ('a1-to-be', 5, 'We are ready.'),
    ('a1-age', 1, 'I am 20 years old.'),
    ('a1-age', 2, 'Fifteen'),
    ('a1-age', 3, 'twelve'),
    ('a1-age', 4, 'is'),
    ('a1-age', 5, 'I am twenty years old.'),
    ('a1-routine', 1, 'drink'),
    ('a1-routine', 2, 'I wake up at seven.'),
    ('a1-routine', 3, 'go'),
    ('a1-routine', 4, 'studies'),
    ('a1-routine', 5, 'I work every day.'),
    ('a1-articles-objects', 1, 'an'),
    ('a1-articles-objects', 2, 'a'),
    ('a1-articles-objects', 3, 'A pen'),
    ('a1-articles-objects', 4, 'The'),
    ('a1-articles-objects', 5, 'This is an orange.'),
    ('a1-family', 1, 'Mãe'),
    ('a1-family', 2, 'parents'),
    ('a1-family', 3, 'Sister'),
    ('a1-family', 4, 'my'),
    ('a1-family', 5, 'My sister is kind.'),
    ('a1-food', 1, 'Water'),
    ('a1-food', 2, 'bread'),
    ('a1-food', 3, 'Banana'),
    ('a1-food', 4, 'like'),
    ('a1-food', 5, 'I like rice and beans.'),
    ('a1-home', 1, 'Bedroom'),
    ('a1-home', 2, 'on'),
    ('a1-home', 3, 'Cozinha'),
    ('a1-home', 4, 'are'),
    ('a1-home', 5, 'The keys are in my bag.'),
    ('a1-time', 1, 'Tuesday'),
    ('a1-time', 2, 'ten'),
    ('a1-time', 3, 'Que horas são?'),
    ('a1-time', 4, 'at'),
    ('a1-time', 5, 'Today is Monday.'),
    ('a1-places', 1, 'At a bus stop'),
    ('a1-places', 2, 'supermarket'),
    ('a1-places', 3, 'Receber cuidados médicos'),
    ('a1-places', 4, 'next to'),
    ('a1-places', 5, 'The park is near the school.'),
    ('a2-past', 1, 'watched'),
    ('a2-past', 2, 'visited'),
    ('a2-past', 3, 'Went'),
    ('a2-past', 4, 'had'),
    ('a2-past', 5, 'We visited our friends yesterday.'),
    ('a2-restaurant', 1, 'Can I have some water, please?'),
    ('a2-restaurant', 2, 'The bill, please.'),
    ('a2-restaurant', 3, 'like'),
    ('a2-restaurant', 4, 'Yes, a coffee, please.'),
    ('a2-restaurant', 5, 'Could I have a menu please?'),
    ('a2-future', 1, 'going to'),
    ('a2-future', 2, 'to'),
    ('a2-future', 3, 'I am going to call my aunt tomorrow.'),
    ('a2-future', 4, 'are'),
    ('a2-future', 5, 'We are going to travel next week.'),
    ('a2-shopping', 1, 'How much is this shirt?'),
    ('a2-shopping', 2, 'size'),
    ('a2-shopping', 3, 'Thirty-five dollars'),
    ('a2-shopping', 4, 'I am just looking, thank you.'),
    ('a2-shopping', 5, 'How much is this jacket?'),
    ('a2-city', 1, 'left'),
    ('a2-city', 2, 'between'),
    ('a2-city', 3, 'How do I get to the station?'),
    ('a2-city', 4, 'Vire à direita no semáforo.'),
    ('a2-city', 5, 'Turn left at the next street.'),
    ('a2-routines', 1, 'Always'),
    ('a2-routines', 2, 'sometimes'),
    ('a2-routines', 3, 'usually'),
    ('a2-routines', 4, 'Never'),
    ('a2-routines', 5, 'He usually walks to work.'),
    ('a2-food-quantities', 1, 'many'),
    ('a2-food-quantities', 2, 'bottle'),
    ('a2-food-quantities', 3, 'How much rice do you want?'),
    ('a2-food-quantities', 4, 'Substantivos contáveis no plural'),
    ('a2-food-quantities', 5, 'We need two eggs and some flour.'),
    ('a2-comparisons', 1, 'cheaper'),
    ('a2-comparisons', 2, 'taller'),
    ('a2-comparisons', 3, 'The smallest'),
    ('a2-comparisons', 4, 'faster'),
    ('a2-comparisons', 5, 'The blue car is faster than the red car.'),
    ('a2-invitations', 1, 'Would you like to have coffee?'),
    ('a2-invitations', 2, 'love'),
    ('a2-invitations', 3, 'I am sorry, I cannot make it tonight.'),
    ('a2-invitations', 4, 'on'),
    ('a2-invitations', 5, 'Would you like to join us for dinner?'),
    ('a2-travel', 1, 'On the timetable'),
    ('a2-travel', 2, 'return'),
    ('a2-travel', 3, 'Plataforma'),
    ('a2-travel', 4, 'at'),
    ('a2-travel', 5, 'The train to Oxford leaves at nine.'),
    ('a2-health', 1, 'I have a headache.'),
    ('a2-health', 2, 'drink'),
    ('a2-health', 3, 'At a pharmacy'),
    ('a2-health', 4, 'Há quanto tempo você se sente assim.'),
    ('a2-health', 5, 'I have a sore throat.'),
    ('a2-messages', 1, 'Please call me back later.'),
    ('a2-messages', 2, 'leave'),
    ('a2-messages', 3, 'Is this a good time to talk?'),
    ('a2-messages', 4, 'later'),
    ('a2-messages', 5, 'Please call me after six.'),
    ('a2-work', 1, 'Can you help me with this, please?'),
    ('a2-work', 2, 'finish'),
    ('a2-work', 3, 'attend'),
    ('a2-work', 4, 'Você poderia repetir isso?'),
    ('a2-work', 5, 'Could you send me the file please?'),
    ('a2-now', 1, 'is'),
    ('a2-now', 2, 'playing'),
    ('a2-now', 3, 'He is cooking dinner now.'),
    ('a2-now', 4, 'am'),
    ('a2-now', 5, 'The children are playing outside.'),
    ('a2-hotel', 1, 'I have a reservation.'),
    ('a2-hotel', 2, 'check'),
    ('a2-hotel', 3, 'Could I have another towel, please?'),
    ('a2-hotel', 4, 'No terceiro andar'),
    ('a2-hotel', 5, 'Is breakfast included in the price?')
)
insert into public.question_answers (question_id, accepted_answers, explanation)
select questions.id, array[question_data.correct_answer], ''
from question_data
join public.lessons on lessons.slug = question_data.lesson_slug
join public.questions on questions.lesson_id = lessons.id
  and questions.sort_order = question_data.question_order
on conflict (question_id) do update set
  accepted_answers = excluded.accepted_answers,
  explanation = excluded.explanation;

do $$
declare
  v_beginner_count integer;
  v_elementary_count integer;
begin
  select count(*) into v_beginner_count
  from public.questions
  join public.lessons on lessons.id = questions.lesson_id
  join public.language_levels on language_levels.id = lessons.level_id
  join public.languages on languages.id = language_levels.language_id
  where languages.code = 'en'
    and language_levels.code = 'A1'
    and questions.is_published
    and lessons.is_published;

  select count(*) into v_elementary_count
  from public.questions
  join public.lessons on lessons.id = questions.lesson_id
  join public.language_levels on language_levels.id = lessons.level_id
  join public.languages on languages.id = language_levels.language_id
  where languages.code = 'en'
    and language_levels.code = 'A2'
    and questions.is_published
    and lessons.is_published;

  if v_beginner_count < 50 or v_elementary_count < 75 then
    raise exception 'Expected at least 50 Beginner and 75 Elementary questions; got % and %',
      v_beginner_count, v_elementary_count;
  end if;
end;
$$;
