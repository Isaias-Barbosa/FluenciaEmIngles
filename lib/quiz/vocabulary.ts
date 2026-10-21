import type { CefrLevel } from "@/lib/cefr/types";
export type VocabularyEntry = { id: string; level: CefrLevel; word: string; meaning: string; example: string; translation: string };
// Original contextual practice content. Bands are editorial teaching suggestions,
// not official CEFR certification. Each entry tests the sense used in its example.
const content: Record<CefrLevel, [string, string, string, string][]> = {
  A1: [
    ["apple","maçã","I eat an apple every morning.","Eu como uma maçã todas as manhãs."],
    ["window","janela","Please open the window.","Por favor, abra a janela."],
    ["friend","amigo ou amiga","My friend lives near my house.","Meu amigo mora perto da minha casa."],
    ["breakfast","café da manhã","We have breakfast at seven.","Nós tomamos café da manhã às sete."],
    ["school","escola","The children are at school.","As crianças estão na escola."],
    ["thirsty","com sede","I am thirsty. Can I have some water?","Estou com sede. Posso tomar um pouco de água?"],
    ["happy","feliz","She is happy with her new book.","Ela está feliz com o livro novo."],
    ["kitchen","cozinha","Dad is cooking in the kitchen.","Papai está cozinhando na cozinha."],
    ["chair","cadeira","There is a chair next to the table.","Há uma cadeira ao lado da mesa."],
    ["cheap","barato","This bag is cheap. It costs five pounds.","Esta bolsa é barata. Ela custa cinco libras."],
    ["early","cedo","I get up early every day.","Eu acordo cedo todos os dias."],
    ["family","família","My family has dinner together.","Minha família janta junta."],
    ["street","rua","There is a shop on this street.","Há uma loja nesta rua."],
    ["teacher","professor ou professora","Our teacher helps us read.","Nossa professora nos ajuda a ler."],
    ["small","pequeno","They live in a small house.","Eles moram em uma casa pequena."],
    ["water","água","Can I have a glass of water?","Posso tomar um copo de água?"],
    ["bread","pão","I eat bread with cheese.","Eu como pão com queijo."],
    ["book","livro","This book has many pictures.","Este livro tem muitas figuras."],
    ["door","porta","Please close the door.","Por favor, feche a porta."],
    ["mother","mãe","My mother is at home.","Minha mãe está em casa."],
    ["sister","irmã","My sister is ten years old.","Minha irmã tem dez anos."],
    ["morning","manhã","I drink milk in the morning.","Eu bebo leite de manhã."],
    ["night","noite","We sleep at night.","Nós dormimos à noite."],
    ["cold","frio","The water is cold.","A água está fria."],
    ["hot","quente","The soup is hot.","A sopa está quente."],
    ["walk","andar a pé","I walk to school with my brother.","Eu vou a pé para a escola com meu irmão."],
    ["read","ler","I read a short story every day.","Eu leio uma história curta todos os dias."],
    ["write","escrever","Please write your name here.","Por favor, escreva seu nome aqui."],
    ["work","trabalhar","I work in a shop.","Eu trabalho em uma loja."],
    ["sleep","dormir","I sleep for eight hours.","Eu durmo por oito horas."],
    ["table","mesa","Your cup is on the table.","Sua xícara está sobre a mesa."],
    ["city","cidade","She lives in a big city.","Ela mora em uma cidade grande."],
    ["train","trem","We go to London by train.","Nós vamos a Londres de trem."],
    ["cat","gato","The cat is under the chair.","O gato está embaixo da cadeira."],
    ["red","vermelho","My new bike is red.","Minha bicicleta nova é vermelha."],
  ],
  A2: [
    ["borrow","pegar emprestado","May I borrow your pen for a minute?","Posso pegar sua caneta emprestada por um minuto?"],
    ["lend","emprestar a alguém","Can you lend me your umbrella?","Você pode me emprestar seu guarda-chuva?"],
    ["journey","viagem ou trajeto","The train journey took two hours.","A viagem de trem levou duas horas."],
    ["crowded","lotado","The bus was crowded this morning.","O ônibus estava lotado esta manhã."],
    ["receipt","recibo ou comprovante","Keep the receipt if you want to return the shirt.","Guarde o recibo se quiser devolver a camisa."],
    ["appointment","compromisso com horário marcado","I have a dentist's appointment tomorrow.","Tenho uma consulta com o dentista amanhã."],
    ["neighbour","vizinho ou vizinha","Our neighbour lives in the house next door.","Nosso vizinho mora na casa ao lado."],
    ["tidy","arrumado","Her bedroom is always tidy.","O quarto dela está sempre arrumado."],
    ["improve","melhorar","I practise every day to improve my English.","Eu pratico todos os dias para melhorar meu inglês."],
    ["weather","tempo ou condições climáticas","The weather is sunny today.","O tempo está ensolarado hoje."],
    ["careful","cuidadoso","Be careful when you cross the road.","Tenha cuidado ao atravessar a rua."],
    ["invite","convidar","We want to invite you to dinner.","Queremos convidar você para jantar."],
    ["return","devolver","Please return the library book on Friday.","Por favor, devolva o livro da biblioteca na sexta-feira."],
    ["choose","escolher","You can choose a red or a blue shirt.","Você pode escolher uma camisa vermelha ou azul."],
    ["enough","suficiente","We have enough food for everyone.","Temos comida suficiente para todos."],
    ["suitcase","mala","I put my clothes in a suitcase.","Eu coloquei minhas roupas em uma mala."],
    ["ticket","bilhete ou passagem","You need a ticket to get on the bus.","Você precisa de uma passagem para entrar no ônibus."],
    ["platform","plataforma de embarque","Our train leaves from platform three.","Nosso trem parte da plataforma três."],
    ["entrance","entrada","The entrance to the museum is on the left.","A entrada do museu fica à esquerda."],
    ["exit","saída","Use this exit to leave the building.","Use esta saída para sair do prédio."],
    ["queue","fila","We waited in a queue outside the cinema.","Nós esperamos em uma fila do lado de fora do cinema."],
    ["bill","conta a pagar","We asked the waiter for the bill after dinner.","Nós pedimos a conta ao garçom depois do jantar."],
    ["change","troco","I paid ten pounds and got two pounds in change.","Eu paguei dez libras e recebi duas libras de troco."],
    ["repair","consertar","Can you repair my broken bicycle?","Você pode consertar minha bicicleta quebrada?"],
    ["complain","reclamar","We had to complain because our room was dirty.","Nós tivemos de reclamar porque nosso quarto estava sujo."],
    ["forget","esquecer","Do not forget to bring your keys.","Não se esqueça de trazer suas chaves."],
    ["remember","lembrar","Do you remember the name of that hotel?","Você se lembra do nome daquele hotel?"],
    ["decide","decidir","We need to decide where to eat tonight.","Nós precisamos decidir onde comer esta noite."],
    ["healthy","saudável","Fruit is a healthy snack.","Fruta é um lanche saudável."],
    ["noisy","barulhento","The street is very noisy at night.","A rua é muito barulhenta à noite."],
    ["quiet","silencioso","We found a quiet place to study.","Nós encontramos um lugar silencioso para estudar."],
    ["polite","educado ou cortês","It is polite to say thank you.","É educado dizer obrigado."],
    ["comfortable","confortável","This sofa is comfortable to sit on.","Este sofá é confortável para sentar."],
    ["stairs","escada entre andares","We took the stairs to the second floor.","Nós subimos de escada até o segundo andar."],
    ["across","do outro lado de","The bank is across the road from the supermarket.","O banco fica do outro lado da rua, em frente ao supermercado."],
  ],
  B1: [
    ["reliable","confiável","You can trust her; she is very reliable.","Você pode confiar nela; ela é muito confiável."],
    ["avoid","evitar","We left early to avoid the traffic.","Saímos cedo para evitar o trânsito."],
    ["afford","ter condições financeiras de pagar","I cannot afford a new car this year.","Não tenho condições de comprar um carro novo neste ano."],
    ["although","embora","Although it was raining, we went for a walk.","Embora estivesse chovendo, fomos caminhar."],
    ["achievement","conquista","Finishing the course was a great achievement.","Concluir o curso foi uma grande conquista."],
    ["request","solicitação","They accepted my request for more information.","Eles aceitaram minha solicitação de mais informações."],
    ["aware","ciente","Are you aware of the new rules?","Você está ciente das novas regras?"],
    ["likely","provável","It is likely to rain this afternoon.","É provável que chova nesta tarde."],
    ["throughout","durante todo","The museum is open throughout the year.","O museu fica aberto durante todo o ano."],
    ["otherwise","caso contrário","Take an umbrella; otherwise, you will get wet.","Leve um guarda-chuva; caso contrário, você vai se molhar."],
    ["benefit","benefício","Regular exercise has an important health benefit.","O exercício regular traz um benefício importante para a saúde."],
    ["issue","problema ou assunto a resolver","We need to discuss this issue before we decide.","Precisamos discutir esse assunto antes de decidir."],
    ["require","exigir ou necessitar","This job will require some experience.","Este trabalho exigirá alguma experiência."],
    ["deal with","lidar com","She knows how to deal with difficult situations.","Ela sabe lidar com situações difíceis."],
    ["keep up with","acompanhar o ritmo de","I walk fast to keep up with my brother.","Eu ando rápido para acompanhar o ritmo do meu irmão."],
    ["disappointed","decepcionado","She was disappointed when the concert was cancelled.","Ela ficou decepcionada quando o show foi cancelado."],
    ["expect","esperar que algo aconteça","We expect the parcel to arrive tomorrow.","Nós esperamos que o pacote chegue amanhã."],
    ["manage","conseguir realizar algo","Did you manage to finish the report on time?","Você conseguiu terminar o relatório no prazo?"],
    ["suggest","sugerir","I suggest taking the earlier bus.","Eu sugiro pegar o ônibus mais cedo."],
    ["opportunity","oportunidade","The course gave me an opportunity to meet new people.","O curso me deu uma oportunidade de conhecer pessoas novas."],
    ["environment","meio ambiente","Using less plastic helps protect the environment.","Usar menos plástico ajuda a proteger o meio ambiente."],
    ["reduce","reduzir","We want to reduce the amount of electricity we use.","Nós queremos reduzir a quantidade de eletricidade que usamos."],
    ["waste","desperdiçar","Do not waste water while you brush your teeth.","Não desperdice água enquanto escova os dentes."],
    ["increase","aumentar","The company plans to increase the number of buses.","A empresa planeja aumentar o número de ônibus."],
    ["experience","experiência prática","She gained useful experience working in a hotel.","Ela ganhou experiência útil trabalhando em um hotel."],
    ["advantage","vantagem","Living near the station is a big advantage.","Morar perto da estação é uma grande vantagem."],
    ["would rather","preferir","I would rather stay home than go out tonight.","Eu preferiria ficar em casa a sair esta noite."],
    ["unless","a menos que","We will have a picnic unless it rains.","Nós faremos um piquenique, a menos que chova."],
    ["instead","em vez disso","We did not drive; we took the train instead.","Nós não fomos de carro; em vez disso, pegamos o trem."],
    ["support","apoiar","My friends support my decision to study abroad.","Meus amigos apoiam minha decisão de estudar no exterior."],
    ["belong","pertencer","Does this jacket belong to you?","Esta jaqueta pertence a você?"],
    ["behave","comportar-se","The children behave well during the lessons.","As crianças se comportam bem durante as aulas."],
    ["apply","candidatar-se","I want to apply for a job at the library.","Eu quero me candidatar a um emprego na biblioteca."],
    ["give up","desistir","Learning takes time, so do not give up.","Aprender leva tempo, então não desista."],
    ["look forward to","aguardar com expectativa positiva","I look forward to seeing you next week.","Eu estou animado para ver você na semana que vem."],
  ],
  B2: [
    ["reluctant","relutante","He was reluctant to share his personal details.","Ele estava relutante em compartilhar seus dados pessoais."],
    ["drawback","desvantagem","The main drawback of the plan is its cost.","A principal desvantagem do plano é seu custo."],
    ["enhance","aprimorar ou aumentar a qualidade","The new lighting will enhance the exhibition.","A nova iluminação vai valorizar a exposição."],
    ["misleading","enganoso","The advertisement was misleading about the price.","O anúncio era enganoso em relação ao preço."],
    ["approach","abordagem","We need a different approach to this problem.","Precisamos de uma abordagem diferente para este problema."],
    ["controversial","controverso","The proposal remains controversial among experts.","A proposta continua controversa entre especialistas."],
    ["account for","explicar ou justificar","How do you account for the sudden increase?","Como você explica o aumento repentino?"],
    ["overcome","superar","They worked together to overcome the difficulties.","Eles trabalharam juntos para superar as dificuldades."],
    ["accurate","exato ou preciso","The report provides accurate figures.","O relatório apresenta números precisos."],
    ["nevertheless","mesmo assim","It was a difficult task; nevertheless, she completed it.","Era uma tarefa difícil; mesmo assim, ela a concluiu."],
    ["feasible","viável","We need to know whether the project is feasible.","Precisamos saber se o projeto é viável."],
    ["insight","compreensão aprofundada","The interview gave us insight into her work.","A entrevista nos deu uma compreensão mais profunda do trabalho dela."],
    ["assess","avaliar","The team will assess the risks before starting.","A equipe avaliará os riscos antes de começar."],
    ["compelling","convincente","She presented compelling evidence for her argument.","Ela apresentou evidências convincentes para seu argumento."],
    ["undermine","enfraquecer","Constant criticism can undermine a person's confidence.","Críticas constantes podem enfraquecer a confiança de uma pessoa."],
    ["consequence","consequência","One consequence of the delay was a higher delivery cost.","Uma consequência do atraso foi um custo de entrega maior."],
    ["sustainable","sustentável","The city is investing in sustainable transport.","A cidade está investindo em transporte sustentável."],
    ["acknowledge","reconhecer ou admitir um fato","The manager had to acknowledge that mistakes had been made.","O gerente teve de reconhecer que erros haviam sido cometidos."],
    ["negotiate","negociar","The union will negotiate better working conditions.","O sindicato negociará melhores condições de trabalho."],
    ["assumption","suposição","The plan is based on the assumption that demand will rise.","O plano se baseia na suposição de que a demanda aumentará."],
    ["significant","importante ou expressivo","There has been a significant improvement in air quality.","Houve uma melhoria expressiva na qualidade do ar."],
    ["persuade","convencer alguém a fazer algo","We tried to persuade him to reconsider his decision.","Nós tentamos convencê-lo a reconsiderar sua decisão."],
    ["prevent","impedir que algo aconteça","Regular checks can prevent equipment failures.","Verificações regulares podem impedir falhas nos equipamentos."],
    ["obstacle","obstáculo","A lack of funding remains the biggest obstacle.","A falta de financiamento continua sendo o maior obstáculo."],
    ["outcome","resultado final","Nobody could predict the outcome of the negotiations.","Ninguém conseguia prever o resultado das negociações."],
    ["distinguish","distinguir","It is important to distinguish facts from opinions.","É importante distinguir fatos de opiniões."],
    ["contribute","contribuir","Everyone can contribute to the success of the project.","Todos podem contribuir para o sucesso do projeto."],
    ["establish","estabelecer ou criar","The charity hopes to establish a new training centre.","A instituição beneficente espera criar um novo centro de treinamento."],
    ["undergo","passar por um processo","The building will undergo major repairs next year.","O prédio passará por grandes reparos no ano que vem."],
    ["raise awareness","conscientizar","The campaign aims to raise awareness of food waste.","A campanha busca conscientizar as pessoas sobre o desperdício de alimentos."],
    ["rule out","descartar uma possibilidade","We cannot rule out the possibility of further delays.","Nós não podemos descartar a possibilidade de novos atrasos."],
    ["put up with","tolerar ou aguentar","Residents should not have to put up with constant noise.","Os moradores não deveriam ter de aguentar barulho constante."],
    ["straightforward","simples e fácil de entender","The instructions are straightforward and easy to follow.","As instruções são simples e fáceis de seguir."],
    ["thorough","completo e cuidadoso","The engineers carried out a thorough inspection.","Os engenheiros fizeram uma inspeção completa e cuidadosa."],
    ["regardless","independentemente","The service is available to everyone, regardless of income.","O serviço está disponível para todos, independentemente da renda."],
  ],
  C1: [
    ["nuanced","que considera diferenças sutis","Her nuanced analysis considered several perspectives.","Sua análise detalhada e sensível às nuances considerou várias perspectivas."],
    ["alleviate","aliviar","The measures aim to alleviate pressure on hospitals.","As medidas visam aliviar a pressão sobre os hospitais."],
    ["plausible","plausível ou verossímil","He offered a plausible explanation for the delay.","Ele apresentou uma explicação plausível para o atraso."],
    ["inadvertently","sem intenção ou por descuido","I inadvertently deleted the original file.","Eu apaguei o arquivo original sem querer."],
    ["substantiate","comprovar com evidências","The researcher could not substantiate the claim.","A pesquisadora não conseguiu comprovar a alegação com evidências."],
    ["convey","transmitir uma ideia ou sentimento","Words alone cannot convey how grateful I am.","Só as palavras não conseguem transmitir como sou grato."],
    ["allocate","destinar recursos","The council will allocate funds to public transport.","O conselho destinará recursos ao transporte público."],
    ["unprecedented","sem precedentes","The region experienced unprecedented growth.","A região teve um crescimento sem precedentes."],
    ["discrepancy","divergência ou diferença inesperada","There is a discrepancy between the two accounts.","Há uma divergência entre os dois relatos."],
    ["meticulous","minucioso","Her meticulous research uncovered several errors.","Sua pesquisa minuciosa revelou vários erros."],
    ["deteriorate","piorar ou se deteriorar","Conditions may deteriorate if no action is taken.","As condições podem piorar se nenhuma medida for tomada."],
    ["ambiguous","com mais de uma interpretação","The wording of the contract is ambiguous.","A redação do contrato é ambígua."],
    ["concede","admitir após resistência","He had to concede that his opponent was right.","Ele teve de admitir que seu oponente estava certo."],
    ["scrutinize","examinar com atenção crítica","The committee will scrutinize every detail of the budget.","O comitê examinará cuidadosamente cada detalhe do orçamento."],
    ["take for granted","não dar o devido valor por considerar garantido","We often take for granted the support we receive.","Muitas vezes não damos o devido valor ao apoio que recebemos."],
    ["coherent","coerente e bem articulado","The essay presents a coherent argument despite its complexity.","O ensaio apresenta um argumento coerente, apesar de sua complexidade."],
    ["allegedly","supostamente, segundo alegações","The documents were allegedly leaked by a former employee.","Segundo alegações, os documentos foram vazados por um ex-funcionário."],
    ["notwithstanding","apesar de","Notwithstanding the criticism, the committee approved the proposal.","Apesar das críticas, o comitê aprovou a proposta."],
    ["undoubtedly","sem dúvida","Her work has undoubtedly influenced a generation of researchers.","O trabalho dela sem dúvida influenciou uma geração de pesquisadores."],
    ["comprehensive","abrangente","The review offers a comprehensive account of the available evidence.","A revisão oferece um relato abrangente das evidências disponíveis."],
    ["subtle","sutil","There is a subtle difference between the two interpretations.","Há uma diferença sutil entre as duas interpretações."],
    ["resilient","capaz de se recuperar diante de dificuldades","The community proved resilient after the severe economic shock.","A comunidade mostrou capacidade de recuperação após o grave choque econômico."],
    ["inevitable","inevitável","Some disruption is inevitable during such a major transition.","Alguma perturbação é inevitável durante uma transição tão grande."],
    ["viable","capaz de funcionar de forma sustentável","Without reliable funding, the organisation is no longer viable.","Sem financiamento confiável, a organização não tem mais condições de se manter."],
    ["constraint","restrição ou limitação","Time is the main constraint on the scope of our research.","O tempo é a principal limitação ao alcance da nossa pesquisa."],
    ["implication","consequência implícita ou possível","One implication of the ruling is that earlier cases may be reopened.","Uma possível consequência da decisão é que casos anteriores sejam reabertos."],
    ["incentive","incentivo","The scheme offers an incentive for businesses to reduce emissions.","O programa oferece um incentivo para as empresas reduzirem as emissões."],
    ["prevail","prevalecer","They hoped that reason would prevail over political pressure.","Eles esperavam que a razão prevalecesse sobre a pressão política."],
    ["exacerbate","agravar","Poor communication could exacerbate existing tensions.","Uma comunicação ruim poderia agravar as tensões existentes."],
    ["dispel","dissipar uma dúvida ou crença","The detailed report helped dispel fears about the proposal.","O relatório detalhado ajudou a dissipar os receios sobre a proposta."],
    ["put into perspective","colocar em perspectiva","Comparing the figures over a decade helps put the recent decline into perspective.","Comparar os números ao longo de uma década ajuda a colocar a queda recente em perspectiva."],
    ["contingent on","dependente de uma condição","Approval is contingent on the completion of an independent review.","A aprovação depende da conclusão de uma revisão independente."],
    ["in the light of","à luz de ou considerando","The policy must be revised in the light of new evidence.","A política precisa ser revista à luz das novas evidências."],
    ["tentative","provisório e sujeito a confirmação","The researchers offered a tentative explanation pending further tests.","Os pesquisadores apresentaram uma explicação provisória, aguardando mais testes."],
    ["profound","profundo ou de grande intensidade","The discovery had a profound effect on our understanding of memory.","A descoberta teve um efeito profundo sobre nossa compreensão da memória."],
  ],
  C2: [
    ["ubiquitous","presente em toda parte","Smartphones have become ubiquitous in daily life.","Os smartphones se tornaram presentes em toda parte no cotidiano."],
    ["obfuscate","tornar confuso ou obscuro","The jargon served to obfuscate a simple explanation.","O jargão serviu para tornar obscura uma explicação simples."],
    ["perfunctory","feito de modo superficial e sem interesse","He gave the document a perfunctory glance.","Ele deu uma olhada superficial e desinteressada no documento."],
    ["ephemeral","de curta duração","The installation explores the ephemeral nature of fame.","A instalação explora a natureza passageira da fama."],
    ["unequivocal","claro e sem margem para dúvida","The board issued an unequivocal rejection of the proposal.","O conselho rejeitou a proposta de forma clara e inequívoca."],
    ["fastidious","muito exigente com detalhes","She is fastidious about the presentation of her work.","Ela é muito exigente com os detalhes da apresentação do trabalho."],
    ["intransigent","que se recusa a ceder","Both parties remained intransigent during the negotiations.","Ambas as partes permaneceram inflexíveis durante as negociações."],
    ["juxtapose","colocar lado a lado para comparar","The exhibition will juxtapose ancient and modern art.","A exposição colocará lado a lado arte antiga e moderna."],
    ["esoteric","compreensível apenas para um grupo especializado","The discussion turned to esoteric aspects of the theory.","A discussão se voltou a aspectos da teoria compreendidos por poucos especialistas."],
    ["serendipity","descoberta feliz que acontece por acaso","Finding the missing letter was an act of serendipity.","Encontrar a carta perdida foi uma feliz descoberta por acaso."],
    ["quintessential","que representa perfeitamente as características de algo","The novel is a quintessential example of the genre.","O romance é um exemplo que representa perfeitamente o gênero."],
    ["parsimonious","excessivamente econômico com dinheiro","The parsimonious owner refused to replace the broken chairs.","O dono excessivamente econômico se recusou a substituir as cadeiras quebradas."],
    ["abstruse","difícil de compreender","The article's abstruse argument puzzled even specialists.","O argumento difícil de compreender do artigo confundiu até especialistas."],
    ["magnanimous","generoso, especialmente com um adversário","She was magnanimous in victory and praised her rival.","Ela foi generosa na vitória e elogiou sua rival."],
    ["conundrum","problema complexo ou enigma","The conflicting evidence presented a conundrum for investigators.","As evidências conflitantes representaram um enigma para os investigadores."],
    ["inchoate","ainda não plenamente formado","The movement gave expression to an inchoate sense of public discontent.","O movimento deu expressão a uma sensação ainda indefinida de descontentamento público."],
    ["inscrutable","difícil de interpretar ou decifrar","Her inscrutable expression gave no hint of her reaction to the verdict.","Sua expressão indecifrável não dava pistas de sua reação ao veredito."],
    ["disingenuous","que disfarça suas reais intenções","It was disingenuous to present a carefully orchestrated campaign as spontaneous.","Foi pouco sincero apresentar uma campanha cuidadosamente orquestrada como espontânea."],
    ["acquiesce","aceitar sem protestar, mesmo sem entusiasmo","Rather than prolong the dispute, the board chose to acquiesce in the decision.","Em vez de prolongar a disputa, o conselho optou por aceitar a decisão sem protestar."],
    ["ostensibly","aparentemente, segundo a razão declarada","The meeting was ostensibly about budgets, though succession dominated the discussion.","A reunião era aparentemente sobre orçamentos, embora a sucessão tenha dominado a discussão."],
    ["excoriate","criticar com extrema severidade","The editorial proceeded to excoriate officials for their prolonged inaction.","O editorial passou a criticar duramente os responsáveis por sua inação prolongada."],
    ["ameliorate","melhorar uma situação desfavorável","The reforms sought to ameliorate conditions without addressing their underlying causes.","As reformas buscavam melhorar as condições sem tratar de suas causas subjacentes."],
    ["trenchant","incisivo e contundente","Her trenchant critique exposed contradictions that earlier reviewers had overlooked.","Sua crítica incisiva expôs contradições que os avaliadores anteriores haviam ignorado."],
    ["equivocal","deliberadamente pouco claro ou inconclusivo","His equivocal response left both sides unsure of where he stood.","Sua resposta pouco clara deixou ambos os lados sem saber qual era sua posição."],
    ["recalcitrant","resistente a obedecer ou cooperar","The mediator struggled to bring the recalcitrant factions back to the table.","O mediador teve dificuldade para trazer as facções resistentes à cooperação de volta à mesa."],
    ["perspicacious","que percebe e compreende com grande clareza","A perspicacious observer would have noticed the flaw in their reasoning.","Um observador perspicaz teria percebido a falha no raciocínio deles."],
    ["assiduous","persistentemente dedicado e aplicado","Her assiduous attention to archival sources transformed the investigation.","Sua atenção diligente às fontes dos arquivos transformou a investigação."],
    ["capricious","que muda de modo imprevisível","Investment suffered under a capricious administration that repeatedly reversed its policies.","Os investimentos sofreram sob uma administração imprevisível que repetidamente revertia suas políticas."],
    ["laconic","que se expressa com poucas palavras","His laconic reply revealed little beyond a firm refusal to negotiate.","Sua resposta lacônica revelou pouco além de uma firme recusa em negociar."],
    ["inveterate","habitual e profundamente arraigado","An inveterate sceptic, she demanded evidence for even the most widely accepted claims.","Cética por hábito arraigado, ela exigia evidências até para as alegações mais amplamente aceitas."],
    ["cogent","logicamente forte e persuasivo","The judgement offered a cogent analysis of the competing constitutional principles.","A decisão apresentou uma análise logicamente convincente dos princípios constitucionais em conflito."],
    ["specious","aparentemente correto, mas enganoso","The argument was specious: its elegant wording concealed a fundamental contradiction.","O argumento parecia correto, mas era enganoso: sua redação elegante escondia uma contradição fundamental."],
    ["inexorable","impossível de deter","The novel traces the inexorable decline of a once influential dynasty.","O romance acompanha o declínio impossível de deter de uma dinastia antes influente."],
    ["circumspect","cauteloso ao avaliar riscos e consequências","Diplomats remained circumspect, unwilling to endorse an agreement they had not examined.","Os diplomatas permaneceram cautelosos, sem disposição para apoiar um acordo que não haviam examinado."],
    ["prescient","capaz de antecipar acontecimentos","Her once dismissed warning now seems remarkably prescient.","Seu alerta, antes ignorado, agora parece ter antecipado os acontecimentos de forma notável."],
  ],
};
export const vocabulary: VocabularyEntry[] = Object.entries(content).flatMap(([level, rows]) => rows.map(([word, meaning, example, translation], i) => ({ id: `${level}-vocab-${i + 1}`, level: level as CefrLevel, word, meaning, example, translation })));
export type QuizQuestion = VocabularyEntry & { options: string[] };
function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export type QuizDrawHistory = Partial<Record<CefrLevel, string[]>>;
export const quizDrawHistoryKey = (userId: string) => `fluencia-vocabulary-draws-v1:${userId}`;

/** Ignore removed, duplicate and foreign-level IDs; new entries remain unseen. */
export function readQuizDrawHistory(raw: string | null): QuizDrawHistory {
  try {
    const value = JSON.parse(raw || "{}");
    const history: QuizDrawHistory = {};
    for (const level of Object.keys(content) as CefrLevel[]) {
      const ids = value?.[level];
      if (!Array.isArray(ids)) continue;
      const valid = new Set(vocabulary.filter((item) => item.level === level).map((item) => item.id));
      history[level] = [...new Set(ids.filter((id): id is string => typeof id === "string" && valid.has(id)))];
    }
    return history;
  } catch { return {}; }
}

/** Exhaust unseen entries before starting a new cycle, even across reloads.
 * A cycle boundary can fall inside a round; never repeat an ID in that round.
 * Persist draws independently of scores: abandoning a round earns no credit.
 */
export function drawVocabularyRound(level: CefrLevel, seenIds: readonly string[] = [], random = Math.random): { round: QuizQuestion[]; seenIds: string[] } {
  const pool = vocabulary.filter((item) => item.level === level);
  const valid = new Set(pool.map((item) => item.id));
  const seen = new Set(seenIds.filter((id) => valid.has(id)));
  const size = Math.min(10, pool.length);
  const selected = shuffle(pool.filter((item) => !seen.has(item.id)), random).slice(0, size);
  let nextSeen = [...seen, ...selected.map((item) => item.id)];
  if (selected.length < size) {
    const current = new Set(selected.map((item) => item.id));
    const refill = shuffle(pool.filter((item) => !current.has(item.id)), random).slice(0, size - selected.length);
    selected.push(...refill);
    nextSeen = refill.map((item) => item.id);
  }
  return { seenIds: nextSeen, round: selected.map((item) => ({ ...item,
    options: shuffle([item.meaning, ...shuffle([...new Set(pool.filter((other) => other.meaning !== item.meaning).map((other) => other.meaning))], random).slice(0, 3)], random) })) };
}

export function makeVocabularyRound(level: CefrLevel, random = Math.random): QuizQuestion[] {
  return drawVocabularyRound(level, [], random).round;
}
export type QuizAnswer = { id: string; selected: string; correct: boolean };
export type QuizState = { phase: "idle" | "playing" | "finished"; round: QuizQuestion[]; index: number; selected: string; checked: boolean; answers: QuizAnswer[] };
export const initialQuizState: QuizState = { phase: "idle", round: [], index: 0, selected: "", checked: false, answers: [] };
export type QuizAction = { type: "start"; round: QuizQuestion[] } | { type: "select"; value: string } | { type: "check" } | { type: "next" } | { type: "reset" };
export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  if (action.type === "reset") return initialQuizState;
  if (action.type === "start") return action.round.length ? { ...initialQuizState, phase: "playing", round: action.round } : state;
  if (state.phase !== "playing") return state;
  const question = state.round[state.index];
  if (action.type === "select" && !state.checked && question.options.includes(action.value)) return { ...state, selected: action.value };
  if (action.type === "check" && !state.checked && state.selected) return { ...state, checked: true,
    answers: [...state.answers, { id: question.id, selected: state.selected, correct: state.selected === question.meaning }] };
  if (action.type === "next" && state.checked) return state.index + 1 === state.round.length
    ? { ...state, phase: "finished" }
    : { ...state, index: state.index + 1, selected: "", checked: false };
  return state;
}
export type QuizStats = Partial<Record<CefrLevel, { rounds: number; best: number; last: number }>>;
export function readQuizStats(raw: string | null): QuizStats {
  try {
    const value = JSON.parse(raw || "{}"); const result: QuizStats = {};
    for (const level of Object.keys(content) as CefrLevel[]) {
      const row = value?.[level];
      if (row && Number.isSafeInteger(row.rounds) && row.rounds >= 0 && row.rounds < 1000000 && Number.isInteger(row.best) && row.best >= 0 && row.best <= 10 && Number.isInteger(row.last) && row.last >= 0 && row.last <= 10) result[level] = { rounds: row.rounds, best: row.best, last: row.last };
    }
    return result;
  } catch { return {}; }
}
