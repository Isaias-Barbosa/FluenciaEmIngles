create table public.proficiency_questions (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references public.language_levels (id) on delete cascade,
  sort_order smallint not null,
  prompt text not null,
  choices jsonb not null check (
    jsonb_typeof(choices) = 'array'
    and jsonb_array_length(choices) = 4
  ),
  correct_option smallint not null check (correct_option between 0 and 3),
  is_published boolean not null default true,
  unique (level_id, sort_order)
);

create table public.proficiency_exam_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exam_type text not null check (exam_type in ('placement', 'promotion')),
  source_level_id uuid references public.language_levels (id) on delete cascade,
  question_ids uuid[] not null,
  recommended_level_id uuid references public.language_levels (id),
  score smallint,
  passed boolean,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (
    (exam_type = 'placement' and source_level_id is null)
    or (exam_type = 'promotion' and source_level_id is not null)
  )
);

create index proficiency_exam_sessions_user_created_idx
  on public.proficiency_exam_sessions (user_id, created_at desc);

alter table public.proficiency_questions enable row level security;
alter table public.proficiency_exam_sessions enable row level security;
revoke all on public.proficiency_questions, public.proficiency_exam_sessions
  from anon, authenticated;

insert into public.proficiency_questions (
  level_id, sort_order, prompt, choices, correct_option
)
select levels.id, questions.sort_order, questions.prompt, questions.choices,
  questions.correct_option
from (
  values
    ('A1', 1, 'Complete: I ___ from Brazil.', jsonb_build_array('am', 'is', 'are', 'be'), 0),
    ('A1', 2, 'Choose the correct plural of “woman”.', jsonb_build_array('womans', 'women', 'womanes', 'womens'), 1),
    ('A1', 3, 'Complete: ___ orange is on the table.', jsonb_build_array('A', 'An', 'Thee', 'Some'), 1),
    ('A1', 4, 'Choose the correct sentence.', jsonb_build_array('He have a blue car.', 'He has a blue car.', 'He is have a blue car.', 'He haves a blue car.'), 1),
    ('A1', 5, 'Complete: They ___ at home today.', jsonb_build_array('is', 'am', 'are', 'be'), 2),
    ('A1', 6, 'Which word asks about a person’s name?', jsonb_build_array('Where', 'When', 'Who', 'How old'), 2),
    ('A1', 7, 'Complete: This is Maria. ___ brother is called João.', jsonb_build_array('Her', 'His', 'Their', 'Our'), 0),
    ('A1', 8, 'Choose the correct preposition: The meeting is ___ Monday.', jsonb_build_array('in', 'on', 'at', 'to'), 1),
    ('A1', 9, 'Complete: I ___ coffee every morning.', jsonb_build_array('drink', 'drinks', 'drinking', 'am drink'), 0),
    ('A1', 10, 'What time is 7:30?', jsonb_build_array('Half past seven', 'Half to seven', 'Quarter past seven', 'Half past six'), 0),
    ('A1', 11, 'Choose the correct response: “Where do you live?”', jsonb_build_array('I live in Recife.', 'I am 25 years.', 'I am fine, thanks.', 'I work yesterday.'), 0),
    ('A1', 12, 'Complete: There ___ two books on the desk.', jsonb_build_array('is', 'are', 'am', 'be'), 1),
    ('A1', 13, 'Choose the correct negative: She ___ like tea.', jsonb_build_array('don’t', 'isn’t', 'doesn’t', 'not'), 2),
    ('A1', 14, 'Which item do you wear on your feet?', jsonb_build_array('Gloves', 'Shoes', 'A hat', 'A belt'), 1),
    ('A1', 15, 'Complete: My birthday is ___ July.', jsonb_build_array('on', 'at', 'in', 'by'), 2),
    ('A1', 16, 'Choose the correct question.', jsonb_build_array('Do you have a sister?', 'Have you a sister do?', 'You do have a sister?', 'Are you have a sister?'), 0),
    ('A1', 17, 'Complete: The opposite of “old” is ___.', jsonb_build_array('young', 'slow', 'long', 'late'), 0),
    ('A2', 1, 'Complete: We ___ the museum yesterday.', jsonb_build_array('visit', 'visited', 'have visit', 'visiting'), 1),
    ('A2', 2, 'Choose the natural sentence.', jsonb_build_array('There is too many people.', 'There are too many people.', 'There are too much people.', 'There is too much people.'), 1),
    ('A2', 3, 'Complete: This bag is ___ than mine.', jsonb_build_array('heavy', 'heavier', 'more heavy', 'heaviest'), 1),
    ('A2', 4, 'Complete: I ___ my grandmother this weekend.', jsonb_build_array('am going to visit', 'visited to', 'going visit', 'am visit'), 0),
    ('A2', 5, 'Choose the correct option: How ___ apples do we need?', jsonb_build_array('much', 'many', 'any', 'a little'), 1),
    ('A2', 6, 'Complete: She was cooking when the phone ___.', jsonb_build_array('rings', 'rang', 'was ring', 'has rung'), 1),
    ('A2', 7, 'Choose the correct sentence.', jsonb_build_array('I have never been to Canada.', 'I never have be to Canada.', 'I have never went to Canada.', 'I never was to Canada.'), 0),
    ('A2', 8, 'Complete: You ___ wear a helmet when you ride a bike.', jsonb_build_array('should', 'would', 'could to', 'are'), 0),
    ('A2', 9, 'Which phrase means “not enough time”?', jsonb_build_array('Too much time', 'Not time enough', 'Not enough time', 'Time too many'), 2),
    ('A2', 10, 'Complete: We haven’t seen them ___ Monday.', jsonb_build_array('for', 'since', 'during', 'while'), 1),
    ('A2', 11, 'Choose the correct question about past plans.', jsonb_build_array('What did you do last night?', 'What you did last night?', 'What did you last night do?', 'What have you do last night?'), 0),
    ('A2', 12, 'Complete: This is the ___ restaurant in town.', jsonb_build_array('good', 'better', 'best', 'more good'), 2),
    ('A2', 13, 'Choose the correct option: There is ___ sugar left.', jsonb_build_array('a few', 'a little', 'many', 'several'), 1),
    ('A2', 14, 'Complete: He speaks very ___.', jsonb_build_array('careful', 'carefully', 'carefulness', 'more careful'), 1),
    ('A2', 15, 'Complete: If it rains, we ___ at home.', jsonb_build_array('stay', 'stayed', 'will stay', 'would stayed'), 2),
    ('A2', 16, 'Choose the correct phrase to ask for directions.', jsonb_build_array('Could you tell me how to get to the station?', 'Could you say me where station?', 'How I arrive station?', 'Tell me to station please.'), 0),
    ('A2', 17, 'Complete: I’m interested ___ learning Italian.', jsonb_build_array('on', 'at', 'in', 'for'), 2),
    ('B1', 1, 'Complete: If I ___ more free time, I would take a course.', jsonb_build_array('have', 'had', 'will have', 'would have'), 1),
    ('B1', 2, 'Choose the correct reported speech: “I am busy,” Tom said.', jsonb_build_array('Tom said he is busy.', 'Tom said he was busy.', 'Tom told he busy.', 'Tom said I was busy.'), 1),
    ('B1', 3, 'Complete: She has worked here ___ five years.', jsonb_build_array('since', 'for', 'during', 'from'), 1),
    ('B1', 4, 'Choose the correct passive sentence.', jsonb_build_array('The bridge built in 1990.', 'The bridge was built in 1990.', 'The bridge is build in 1990.', 'The bridge has build in 1990.'), 1),
    ('B1', 5, 'Complete: I’m used to ___ up early.', jsonb_build_array('get', 'getting', 'got', 'to get'), 1),
    ('B1', 6, 'Which phrase means “to postpone”?', jsonb_build_array('Put off', 'Take after', 'Look into', 'Come across'), 0),
    ('B1', 7, 'Complete: You ___ have told me; I could have helped.', jsonb_build_array('should', 'must', 'can', 'may'), 0),
    ('B1', 8, 'Choose the correct relative pronoun: The woman ___ called is my manager.', jsonb_build_array('which', 'whose', 'who', 'where'), 2),
    ('B1', 9, 'Complete: By next Friday, I ___ the report.', jsonb_build_array('finish', 'finished', 'will have finished', 'am finishing yesterday'), 2),
    ('B1', 10, 'Choose the best connector: ___ it was raining, they continued the match.', jsonb_build_array('Despite', 'Although', 'Because of', 'In spite'), 1),
    ('B1', 11, 'Complete: He denied ___ the window.', jsonb_build_array('break', 'to break', 'breaking', 'broke'), 2),
    ('B1', 12, 'Choose the correct sentence.', jsonb_build_array('I have been living here since 2020.', 'I live here since 2020.', 'I am living here for 2020.', 'I have live here since 2020.'), 0),
    ('B1', 13, 'Complete: The train was delayed, ___ we arrived late.', jsonb_build_array('so', 'although', 'unless', 'whereas'), 0),
    ('B1', 14, 'Which phrase means “to tolerate”?', jsonb_build_array('Put up with', 'Run out of', 'Break into', 'Get over'), 0),
    ('B1', 15, 'Complete: She asked me where I ___.', jsonb_build_array('work', 'did work', 'worked', 'am working'), 2),
    ('B1', 16, 'Choose the correct form: I wish I ___ how to play the piano.', jsonb_build_array('know', 'knew', 'will know', 'have known'), 1),
    ('B1', 17, 'Complete: You won’t pass ___ you study regularly.', jsonb_build_array('if', 'unless', 'because', 'when'), 1),
    ('B2', 1, 'Complete: By the time the guests arrived, we ___ dinner.', jsonb_build_array('prepared', 'have prepared', 'had prepared', 'were prepare'), 2),
    ('B2', 2, 'Choose the correct inversion.', jsonb_build_array('Never I have seen such a view.', 'Never have I seen such a view.', 'Never did I have seen such a view.', 'Never I saw have such a view.'), 1),
    ('B2', 3, 'Complete: The proposal, ___ was submitted yesterday, needs revision.', jsonb_build_array('that', 'who', 'which', 'whose'), 2),
    ('B2', 4, 'Choose the best meaning of “to bring about a change”.', jsonb_build_array('To prevent a change', 'To cause a change', 'To explain a change', 'To delay a change'), 1),
    ('B2', 5, 'Complete: If they ___ the warning, they wouldn’t be in trouble now.', jsonb_build_array('heeded', 'had heeded', 'would heed', 'have heeded'), 1),
    ('B2', 6, 'Choose the correct reported speech.', jsonb_build_array('She suggested to take a taxi.', 'She suggested taking a taxi.', 'She suggested us take a taxi.', 'She suggested that taking a taxi.'), 1),
    ('B2', 7, 'Complete: The results ___ by an independent team next month.', jsonb_build_array('will verify', 'will be verified', 'are verifying', 'have verified'), 1),
    ('B2', 8, 'Which word means “to make something less severe”?', jsonb_build_array('Exacerbate', 'Mitigate', 'Dismiss', 'Prolong'), 1),
    ('B2', 9, 'Complete: She is believed ___ the country last week.', jsonb_build_array('to leave', 'leaving', 'to have left', 'that left'), 2),
    ('B2', 10, 'Choose the correct collocation.', jsonb_build_array('Do a decision', 'Make a decision', 'Build a decision', 'Perform a decision'), 1),
    ('B2', 11, 'Complete: I’d rather you ___ anyone about this.', jsonb_build_array('don’t tell', 'didn’t tell', 'won’t tell', 'not telling'), 1),
    ('B2', 12, 'Choose the sentence with a defining relative clause.', jsonb_build_array('My car, which is red, is outside.', 'The book that you lent me was fascinating.', 'Paris, where I was born, is beautiful.', 'My sister, who lives abroad, is visiting.'), 1),
    ('B2', 13, 'Complete: No sooner ___ the meeting than the fire alarm rang.', jsonb_build_array('we had started', 'had we started', 'we started', 'did we started'), 1),
    ('B2', 14, 'Which phrase means “to understand the main point”?', jsonb_build_array('Get the gist', 'Miss the boat', 'Take a rain check', 'Call it even'), 0),
    ('B2', 15, 'Complete: Despite ___ exhausted, he kept working.', jsonb_build_array('he was', 'being', 'was', 'be'), 1),
    ('B2', 16, 'Choose the most natural sentence.', jsonb_build_array('The more you practise, the more confident you become.', 'More you practise, more confident you become.', 'The more you practise, more you become confident.', 'The most you practise, the confident you become.'), 0),
    ('B2', 17, 'Complete: It’s high time we ___ a decision.', jsonb_build_array('make', 'made', 'will make', 'have made'), 1),
    ('C1', 1, 'Complete: Had the committee consulted experts, it ___ the error.', jsonb_build_array('might avoid', 'might have avoided', 'will avoid', 'had avoided'), 1),
    ('C1', 2, 'Choose the closest meaning of “the evidence is tenuous”.', jsonb_build_array('The evidence is conclusive.', 'The evidence is weak.', 'The evidence is irrelevant.', 'The evidence is extensive.'), 1),
    ('C1', 3, 'Complete: Little ___ that the decision would prove so controversial.', jsonb_build_array('they knew', 'did they know', 'they had known', 'knew they'), 1),
    ('C1', 4, 'Choose the best collocation.', jsonb_build_array('Pose a threat', 'Do a threat', 'Build a threat', 'Make a threatness'), 0),
    ('C1', 5, 'Complete: The report is not so much inaccurate ___ incomplete.', jsonb_build_array('than', 'as', 'but', 'that'), 1),
    ('C1', 6, 'Which adjective means “carefully thought out and expressed”?', jsonb_build_array('Articulate', 'Articulated', 'Articulatory', 'Artless'), 0),
    ('C1', 7, 'Complete: Were the data ___ independently, the conclusion might differ.', jsonb_build_array('to analyse', 'analysed', 'analysing', 'to have analyse'), 1),
    ('C1', 8, 'Choose the sentence that appropriately hedges a claim.', jsonb_build_array('This proves the policy always works.', 'The findings appear to suggest a modest improvement.', 'There is no possible doubt about the result.', 'The result is certainly universal.'), 1),
    ('C1', 9, 'Complete: The board insisted that every applicant ___ interviewed.', jsonb_build_array('is', 'was', 'be', 'will be'), 2),
    ('C1', 10, 'Which phrase means “to avoid discussing the main issue”?', jsonb_build_array('Beat around the bush', 'Get straight to the point', 'Take something at face value', 'Keep someone posted'), 0),
    ('C1', 11, 'Complete: Not until the figures were checked ___ the discrepancy.', jsonb_build_array('we noticed', 'did we notice', 'we had notice', 'noticed we'), 1),
    ('C1', 12, 'Choose the most precise word: Her account was ___ with contradictions.', jsonb_build_array('rife', 'plentiful', 'crowded', 'stuffed'), 0),
    ('C1', 13, 'Complete: The measure was introduced, ___ its limited evidence base.', jsonb_build_array('notwithstanding', 'whereas', 'lest', 'inasmuch'), 0),
    ('C1', 14, 'Choose the correct meaning of “to allay concerns”.', jsonb_build_array('To intensify worries', 'To relieve worries', 'To ignore objections', 'To create uncertainty'), 1),
    ('C1', 15, 'Complete: So compelling ___ that even its critics reconsidered.', jsonb_build_array('the case was', 'was the case', 'did the case', 'the case did'), 1),
    ('C1', 16, 'Which phrase means “to acknowledge an uncomfortable fact”?', jsonb_build_array('Face up to something', 'Brush something aside', 'Lay something on', 'Put something through'), 0),
    ('C2', 1, 'Choose the sentence with the most precise use of “disinterested”.', jsonb_build_array('She was disinterested in the lecture and fell asleep.', 'As a disinterested mediator, he had no stake in the outcome.', 'The disinterested novel was hard to finish.', 'They disinterested the proposal.'), 1),
    ('C2', 2, 'Complete: So nuanced ___ the account that it resisted easy interpretation.', jsonb_build_array('the account was', 'was the account', 'did the account', 'the account did'), 1),
    ('C2', 3, 'Which phrase means “to make a bad situation worse”?', jsonb_build_array('To cut corners', 'To take the plunge', 'To add fuel to the fire', 'To call it a day'), 2),
    ('C2', 4, 'Complete: Be that as it ___, the implications remain significant.', jsonb_build_array('may', 'might', 'is', 'was'), 0),
    ('C2', 5, 'Choose the closest meaning of “a specious argument”.', jsonb_build_array('An apparently plausible but misleading argument', 'An entirely irrelevant argument', 'A carefully substantiated argument', 'A deliberately brief argument'), 0),
    ('C2', 6, 'Complete: Had it not been for her intervention, the talks ___ down.', jsonb_build_array('would break', 'would have broken', 'had broken', 'will have broken'), 1),
    ('C2', 7, 'Which word means “to express disapproval of something publicly”?', jsonb_build_array('Condone', 'Censure', 'Concur', 'Confer'), 1),
    ('C2', 8, 'Choose the sentence with the correct subjunctive.', jsonb_build_array('The judge recommended that he is released.', 'The judge recommended that he be released.', 'The judge recommended him to be release.', 'The judge recommended that he was release.'), 1),
    ('C2', 9, 'Complete: Much ___ about the proposal, little has been decided.', jsonb_build_array('has been said', 'said has been', 'it has said', 'has said it'), 0),
    ('C2', 10, 'Which phrase means “to accept something without question”?', jsonb_build_array('Take something with a pinch of salt', 'Take something at face value', 'Put something into perspective', 'Read between the lines'), 1),
    ('C2', 11, 'Choose the closest meaning of “her response was equivocal”.', jsonb_build_array('It was deliberately ambiguous.', 'It was openly hostile.', 'It was completely accurate.', 'It was unexpectedly generous.'), 0),
    ('C2', 12, 'Complete: Were the claim ___, it would overturn decades of research.', jsonb_build_array('substantiated', 'substantiate', 'to substantiate', 'substantiating'), 0),
    ('C2', 13, 'Choose the best meaning of “to brook no opposition”.', jsonb_build_array('To welcome disagreement', 'To tolerate no opposition', 'To avoid making a decision', 'To negotiate with opponents'), 1),
    ('C2', 14, 'Complete: No amount of persuasion ___ him to reconsider.', jsonb_build_array('were likely to cause', 'was likely to make', 'were likely making', 'was likely causing to'), 1),
    ('C2', 15, 'Which word means “to weaken or undermine gradually”?', jsonb_build_array('Bolster', 'Erode', 'Consolidate', 'Reinforce'), 1),
    ('C2', 16, 'Choose the most natural sentence.', jsonb_build_array('Not only the findings were inconclusive, but they were also contradictory.', 'Not only were the findings inconclusive, but they were also contradictory.', 'Not only did the findings inconclusive, but also contradictory.', 'Not only the findings inconclusive were, but contradictory.'), 1)
) as questions(level_code, sort_order, prompt, choices, correct_option)
join public.languages on languages.code = 'en'
join public.language_levels as levels
  on levels.language_id = languages.id
  and levels.code = questions.level_code
on conflict (level_id, sort_order) do update
set prompt = excluded.prompt,
    choices = excluded.choices,
    correct_option = excluded.correct_option,
    is_published = true;

create function public.get_proficiency_exam(p_exam_type text)
returns table (
  exam_id uuid,
  question_id uuid,
  level_code text,
  prompt text,
  choices jsonb,
  question_number integer,
  question_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_level_id uuid;
  v_language_id uuid;
  v_exam_id uuid;
  v_question_ids uuid[];
  v_expected_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication is required to start an exam'
      using errcode = '28000';
  end if;

  if p_exam_type is null or p_exam_type not in ('placement', 'promotion') then
    raise exception 'Unknown proficiency exam type'
      using errcode = '22023';
  end if;

  select profiles.current_level_id, levels.language_id
  into v_level_id, v_language_id
  from public.profiles
  join public.language_levels as levels
    on levels.id = profiles.current_level_id
  where profiles.user_id = v_user_id;

  if v_level_id is null then
    raise exception 'A learner profile with a current level is required'
      using errcode = '22023';
  end if;

  if p_exam_type = 'placement' then
    if exists (
      select 1 from public.profiles
      where user_id = v_user_id and onboarding_completed
    ) then
      raise exception 'Placement exams are only available during onboarding'
        using errcode = '22023';
    end if;

    with randomized as (
      select questions.id, levels.sort_order as level_order, random() as random_order,
        row_number() over (
          partition by questions.level_id order by random()
        ) as level_question_order
      from public.proficiency_questions as questions
      join public.language_levels as levels on levels.id = questions.level_id
      join public.languages on languages.id = levels.language_id
      where languages.code = 'en' and questions.is_published
    )
    select array_agg(id order by level_order, random_order)
    into v_question_ids
    from randomized
    where level_question_order <= 3;
    v_expected_count := 18;
  else
    if not exists (
      select 1 from public.profiles
      where user_id = v_user_id and onboarding_completed
    ) then
      raise exception 'Complete onboarding before taking a promotion exam'
        using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.questions
      join public.lessons on lessons.id = questions.lesson_id
      left join public.question_attempts as attempts
        on attempts.question_id = questions.id
        and attempts.user_id = v_user_id
        and attempts.is_correct
      where lessons.level_id = v_level_id
        and lessons.is_published
        and questions.is_published
        and attempts.id is null
    ) then
      select array_agg(id order by random_order)
      into v_question_ids
      from (
        select questions.id, random() as random_order
        from public.proficiency_questions as questions
        where questions.level_id = v_level_id and questions.is_published
        order by random()
        limit 10
      ) as selected_questions;
    else
      raise exception 'Complete every published lesson question in the current level first'
        using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.language_levels as current_level
      join public.language_levels as next_level
        on next_level.language_id = current_level.language_id
        and next_level.sort_order = current_level.sort_order + 1
      where current_level.id = v_level_id
    ) then
      raise exception 'There is no higher level to unlock'
        using errcode = '22023';
    end if;
    v_expected_count := 10;
  end if;

  if coalesce(cardinality(v_question_ids), 0) <> v_expected_count then
    raise exception 'The proficiency question bank does not contain enough published questions'
      using errcode = '55000';
  end if;

  insert into public.proficiency_exam_sessions (
    user_id, exam_type, source_level_id, question_ids
  )
  values (
    v_user_id,
    p_exam_type,
    case when p_exam_type = 'promotion' then v_level_id else null end,
    v_question_ids
  )
  returning id into v_exam_id;

  return query
  select v_exam_id, questions.id, levels.code, questions.prompt, questions.choices,
    assigned.ordinality::integer, v_expected_count
  from pg_catalog.unnest(v_question_ids) with ordinality as assigned(id, ordinality)
  join public.proficiency_questions as questions on questions.id = assigned.id
  join public.language_levels as levels on levels.id = questions.level_id
  order by assigned.ordinality;
end;
$$;

create function public.submit_proficiency_exam(
  p_exam_id uuid,
  p_answers integer[]
)
returns table (
  exam_type text,
  score integer,
  passed boolean,
  recommended_level text,
  advanced_level text,
  a1_score integer,
  a2_score integer,
  b1_score integer,
  b2_score integer,
  c1_score integer,
  c2_score integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_exam public.proficiency_exam_sessions%rowtype;
  v_question record;
  v_level_codes text[] := array['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  v_level_scores integer[] := array[0, 0, 0, 0, 0, 0];
  v_answer_index integer;
  v_score integer := 0;
  v_passed boolean;
  v_recommended_index integer := 1;
  v_recommended_level text;
  v_advanced_level text;
  v_level_index integer;
begin
  if v_user_id is null then
    raise exception 'Authentication is required to submit an exam'
      using errcode = '28000';
  end if;

  select * into v_exam
  from public.proficiency_exam_sessions
  where id = p_exam_id and user_id = v_user_id
  for update;

  if not found or v_exam.completed_at is not null then
    raise exception 'An active proficiency exam was not found'
      using errcode = '22023';
  end if;

  if v_exam.exam_type = 'promotion'
    and not exists (
      select 1 from public.profiles
      where user_id = v_user_id and current_level_id = v_exam.source_level_id
    ) then
    raise exception 'Your current level changed; start a new promotion exam'
      using errcode = '22023';
  end if;

  if p_answers is null
    or cardinality(p_answers) <> cardinality(v_exam.question_ids)
    or exists (
      select 1 from unnest(p_answers) as answers(answer)
      where answers.answer is null or answers.answer not between 0 and 3
    ) then
    raise exception 'Provide one valid answer for every exam question'
      using errcode = '22023';
  end if;

  for v_question in
    select questions.id, questions.correct_option, levels.code, assigned.ordinality
    from unnest(v_exam.question_ids) with ordinality as assigned(id, ordinality)
    join public.proficiency_questions as questions on questions.id = assigned.id
    join public.language_levels as levels on levels.id = questions.level_id
    order by assigned.ordinality
  loop
    v_answer_index := p_answers[v_question.ordinality::integer];
    if v_answer_index = v_question.correct_option then
      v_score := v_score + 1;
      v_level_index := array_position(v_level_codes, v_question.code);
      if v_level_index is not null then
        v_level_scores[v_level_index] := v_level_scores[v_level_index] + 1;
      end if;
    end if;
  end loop;

  if v_exam.exam_type = 'placement' then
    for v_level_index in 1..6 loop
      if v_level_scores[v_level_index] >= 2 and v_level_index < 6 then
        v_recommended_index := v_level_index + 1;
      else
        v_recommended_index := v_level_index;
        exit;
      end if;
    end loop;
    v_recommended_level := v_level_codes[v_recommended_index];
    select levels.id into v_exam.recommended_level_id
    from public.language_levels as levels
    join public.languages on languages.id = levels.language_id
    where languages.code = 'en' and levels.code = v_recommended_level;
    v_passed := true;
  else
    v_passed := v_score >= 7;
    if v_passed then
      update public.profiles
      set current_level_id = next_level.id,
          updated_at = now()
      from public.language_levels as current_level
      join public.language_levels as next_level
        on next_level.language_id = current_level.language_id
        and next_level.sort_order = current_level.sort_order + 1
      where profiles.user_id = v_user_id
        and profiles.current_level_id = v_exam.source_level_id
        and current_level.id = v_exam.source_level_id;
      if not found then
        raise exception 'The next level could not be unlocked'
          using errcode = '22023';
      end if;
      select code into v_advanced_level
      from public.language_levels
      where id = (select current_level_id from public.profiles where user_id = v_user_id);
    end if;
  end if;

  update public.proficiency_exam_sessions
  set completed_at = now(),
      score = v_score,
      passed = v_passed,
      recommended_level_id = case
        when v_exam.exam_type = 'placement' then v_exam.recommended_level_id
        else null
      end
  where id = p_exam_id and user_id = v_user_id;

  return query select
    v_exam.exam_type, v_score, v_passed, v_recommended_level, v_advanced_level,
    v_level_scores[1], v_level_scores[2], v_level_scores[3],
    v_level_scores[4], v_level_scores[5], v_level_scores[6];
end;
$$;

revoke all on function public.get_proficiency_exam(text) from public, anon;
grant execute on function public.get_proficiency_exam(text) to authenticated;
revoke all on function public.submit_proficiency_exam(uuid, integer[]) from public, anon;
grant execute on function public.submit_proficiency_exam(uuid, integer[]) to authenticated;

create or replace function public.complete_onboarding(
  p_level_code text,
  p_learning_goal text,
  p_daily_goal_minutes smallint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_level_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication is required to complete onboarding'
      using errcode = '28000';
  end if;

  if p_learning_goal is null
    or pg_catalog.btrim(p_learning_goal) = ''
    or pg_catalog.char_length(p_learning_goal) > 100
    or p_daily_goal_minutes is null
    or p_daily_goal_minutes not in (10, 20, 30, 45) then
    raise exception 'Invalid learning goal or daily goal'
      using errcode = '22023';
  end if;

  select levels.id into v_level_id
  from public.language_levels as levels
  join public.languages on languages.id = levels.language_id
  where languages.code = 'en' and levels.code = p_level_code;

  if v_level_id is null or not exists (
    select 1 from public.proficiency_exam_sessions
    where user_id = v_user_id
      and exam_type = 'placement'
      and completed_at is not null
      and passed
      and recommended_level_id = v_level_id
  ) then
    raise exception 'Complete the proficiency placement exam before onboarding'
      using errcode = '22023';
  end if;

  update public.profiles
  set current_level_id = v_level_id,
      learning_goal = pg_catalog.btrim(p_learning_goal),
      daily_goal_minutes = p_daily_goal_minutes,
      onboarding_completed = true,
      updated_at = pg_catalog.now()
  where user_id = v_user_id
    and not onboarding_completed;

  if not found then
    raise exception 'Profile not found or onboarding is already complete'
      using errcode = '22023';
  end if;
end;
$$;

create or replace function public.apply_placement_level(p_level_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_target_order smallint;
  v_current_order smallint;
begin
  if v_user_id is null then
    raise exception 'Authentication is required to update a learning level'
      using errcode = '28000';
  end if;

  select target.sort_order, current_level.sort_order
  into v_target_order, v_current_order
  from public.profiles
  join public.language_levels as current_level
    on current_level.id = profiles.current_level_id
  join public.language_levels as target
    on target.language_id = current_level.language_id
  join public.languages on languages.id = target.language_id
  where profiles.user_id = v_user_id
    and profiles.onboarding_completed
    and languages.code = 'en'
    and target.code = p_level_code;

  if v_target_order is null or v_current_order is null then
    raise exception 'Unknown English level or completed learner profile was not found'
      using errcode = '22023';
  end if;

  if v_target_order > v_current_order then
    raise exception 'Complete the current level and pass its promotion exam to advance'
      using errcode = '22023';
  end if;

  update public.profiles
  set current_level_id = target.id,
      updated_at = pg_catalog.now()
  from public.language_levels as target
  join public.languages on languages.id = target.language_id
  where profiles.user_id = v_user_id
    and languages.code = 'en'
    and target.code = p_level_code;
end;
$$;

drop function public.submit_question_answer(uuid, text);

create function public.submit_question_answer(
  p_question_id uuid,
  p_submitted_answer text
)
returns table (
  is_correct boolean,
  explanation text,
  level_completed boolean,
  wrong_attempts integer,
  hint text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_correct boolean;
  v_explanation text;
  v_hint text;
  v_level_id uuid;
  v_level_completed boolean := false;
  v_wrong_attempts integer := 0;
  v_normalized_answer text;
begin
  if v_user_id is null then
    raise exception 'Authentication is required to submit an answer'
      using errcode = '28000';
  end if;
  if p_submitted_answer is null or pg_catalog.btrim(p_submitted_answer) = '' then
    raise exception 'An answer is required' using errcode = '22023';
  end if;

  v_normalized_answer := pg_catalog.lower(pg_catalog.btrim(
    pg_catalog.regexp_replace(
      pg_catalog.regexp_replace(p_submitted_answer, '[[:punct:]]', ' ', 'g'),
      '\s+', ' ', 'g'
    )
  ));

  select
    exists (
      select 1 from pg_catalog.unnest(answer_key.accepted_answers) as accepted(answer)
      where pg_catalog.lower(pg_catalog.btrim(
        pg_catalog.regexp_replace(
          pg_catalog.regexp_replace(accepted.answer, '[[:punct:]]', ' ', 'g'),
          '\s+', ' ', 'g'
        )
      )) = v_normalized_answer
    ),
    answer_key.explanation,
    answer_key.hint
  into v_is_correct, v_explanation, v_hint
  from public.questions
  join public.lessons on lessons.id = questions.lesson_id
  join public.question_answers as answer_key on answer_key.question_id = questions.id
  where questions.id = p_question_id
    and questions.is_published
    and lessons.is_published;

  if not found then
    raise exception 'Published question was not found' using errcode = '22023';
  end if;

  insert into public.question_attempts (
    user_id, question_id, submitted_answer, is_correct
  )
  values (v_user_id, p_question_id, pg_catalog.btrim(p_submitted_answer), v_is_correct);

  if not v_is_correct then
    select count(*)::integer into v_wrong_attempts
    from public.question_attempts as attempts
    where attempts.user_id = v_user_id
      and attempts.question_id = p_question_id
      and not attempts.is_correct;
  else
    select profiles.current_level_id into v_level_id
    from public.profiles
    where profiles.user_id = v_user_id and profiles.onboarding_completed;

    if v_level_id is not null
      and exists (
        select 1 from public.questions
        join public.lessons on lessons.id = questions.lesson_id
        where lessons.level_id = v_level_id
          and lessons.is_published and questions.is_published
      )
      and not exists (
        select 1 from public.questions
        join public.lessons on lessons.id = questions.lesson_id
        left join public.question_attempts as attempts
          on attempts.question_id = questions.id
          and attempts.user_id = v_user_id
          and attempts.is_correct
        where lessons.level_id = v_level_id
          and lessons.is_published
          and questions.is_published
          and attempts.id is null
      ) then
      v_level_completed := true;
    end if;
  end if;

  return query select v_is_correct, v_explanation, v_level_completed,
    v_wrong_attempts, case when v_wrong_attempts >= 5 then v_hint else null end;
end;
$$;

revoke all on function public.submit_question_answer(uuid, text)
  from public, anon;
grant execute on function public.submit_question_answer(uuid, text)
  to authenticated;
