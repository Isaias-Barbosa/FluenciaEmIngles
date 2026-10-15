export type LearningVideo = {
  id: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  title: string;
  durationSeconds: number;
  url: string;
};

export const learningVideos: LearningVideo[] = [
  { id: "a1-be-verbs", level: "A1", title: "Beginner English A1 01 Be Verbs", durationSeconds: 121, url: "https://www.voicetube.com/videos/198652" },
  { id: "a1-greetings", level: "A1", title: "The Oxford 3000: Hey, Hi, Bye & More! Basic English Greetings", durationSeconds: 111, url: "https://www.voicetube.com/videos/206713" },
  { id: "a2-vocabulary-exam-tips", level: "A2", title: "Exam skills: 5 tips about building vocabulary", durationSeconds: 153, url: "https://www.voicetube.com/videos/49326" },
  { id: "a2-american-pronunciation-vocabulary", level: "A2", title: "How to Increase Your Vocabulary — American English Pronunciation", durationSeconds: 133, url: "https://www.voicetube.com/videos/29878" },
  { id: "a2-difficult-vocabulary", level: "A2", title: "Exam skills: 5 tips for dealing with new and difficult vocabulary", durationSeconds: 165, url: "https://www.voicetube.com/videos/83851" },
  { id: "a2-airport-english", level: "A2", title: "Airport English", durationSeconds: 172, url: "https://www.voicetube.com/videos/9215" },
  { id: "a2-business-telephone", level: "A2", title: "Business English: Telephone Conversation", durationSeconds: 72, url: "https://www.voicetube.com/videos/180903" },
  { id: "a2-grammar-mistakes", level: "A2", title: "Common English Grammar Mistakes", durationSeconds: 93, url: "https://www.voicetube.com/videos/160431" },
  { id: "a2-cefr", level: "A2", title: "What Is the CEFR?", durationSeconds: 176, url: "https://www.voicetube.com/videos/53012" },
  { id: "b1-vocabulary-steps", level: "B1", title: "5 Steps to Increasing Your English Vocabulary", durationSeconds: 94, url: "https://www.voicetube.com/videos/8158" },
  { id: "b1-grammar", level: "B1", title: "Easiest Way to Learn English Grammar", durationSeconds: 158, url: "https://www.voicetube.com/videos/31153" },
  { id: "b1-grammar-intro", level: "B1", title: "Introduction to Grammar | Khan Academy", durationSeconds: 166, url: "https://www.voicetube.com/videos/59862" },
  { id: "b1-varieties", level: "B1", title: "English Language Learning Tips: Varieties of English", durationSeconds: 169, url: "https://www.voicetube.com/videos/25000" },
  { id: "b1-negotiations", level: "B1", title: "Business English Conversation: Negotiations", durationSeconds: 142, url: "https://www.voicetube.com/videos/181865" },
  { id: "b1-describing-things", level: "B1", title: "Describing Things: English Conversation", durationSeconds: 168, url: "https://www.voicetube.com/videos/166182" },
  { id: "b1-cloud-idioms", level: "B1", title: "British English Expressions: Cloud Idioms", durationSeconds: 178, url: "https://www.voicetube.com/videos/51512" },
  { id: "b2-scrutiny", level: "B2", title: "Advanced Vocabulary: Scrutiny", durationSeconds: 165, url: "https://www.voicetube.com/videos/178024" },
  { id: "c1-collision-course", level: "C1", title: "Collision Course | Official Trailer", durationSeconds: 133, url: "https://www.voicetube.com/videos/221107" },
  { id: "c1-wheres-wanda", level: "C1", title: "Where's Wanda? — Season 2 Official Trailer", durationSeconds: 103, url: "https://www.voicetube.com/videos/220790" },
  { id: "c1-slow-horses", level: "C1", title: "Slow Horses", durationSeconds: 90, url: "https://www.voicetube.com/videos/220613" },
  { id: "c2-rage", level: "C2", title: "Rage Season 2 | Official Trailer", durationSeconds: 128, url: "https://www.voicetube.com/videos/220664" },
  { id: "c2-ghost-in-the-cell", level: "C2", title: "Ghost in the Cell | Official Trailer", durationSeconds: 123, url: "https://www.voicetube.com/videos/219571" },
  { id: "c2-kaulitz", level: "C2", title: "Kaulitz & Kaulitz | Official Trailer", durationSeconds: 119, url: "https://www.voicetube.com/videos/212335" },
];
