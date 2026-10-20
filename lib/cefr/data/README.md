# Lexical reference data and attribution

`vocabulary.json` is a derived, normalized index built from the following datasets at
https://github.com/openlanguageprofiles/olp-en-cefrj/tree/d4e45b75b38f27b30dfc5c44d8c571aec7e7092f

- **The CEFR-J Wordlist Version 1.5**, compiled by Yukio Tono, Tono Laboratory, Tokyo University of Foreign Studies (TUFS). Originally retrieved by Open Language Profiles from http://www.cefr-j.org/download.html on 2020-01-20. Copyright belongs to Tono Laboratory at TUFS. Research and commercial use are permitted without charge provided that the dataset is cited. Full published terms: https://github.com/openlanguageprofiles/olp-en-cefrj/blob/d4e45b75b38f27b30dfc5c44d8c571aec7e7092f/README.md
- **Octanove Vocabulary Profile C1/C2, version 1.0**, created by Octanove Labs, distributed under **Creative Commons Attribution-ShareAlike 4.0 International**, https://creativecommons.org/licenses/by-sa/4.0/ . C1/C2 source: https://github.com/openlanguageprofiles/olp-en-cefrj/blob/d4e45b75b38f27b30dfc5c44d8c571aec7e7092f/octanove-vocabulary-profile-c1c2-1.0.csv

Changes: lowercase normalization, expansion of slash variants, removal of non-lexical entries,
and conversion of CEFR labels to numeric bands (A1=1 to C2=6). When several senses/parts of
speech have different levels, the index keeps the **lowest listed level**, not a guessed sense.
The C1/C2-derived data and this combined derived index are made available under CC BY-SA 4.0,
subject to the original CEFR-J citation requirements above. This data license does not relicense
unrelated application code. The original publishers do not guarantee accuracy or endorse this app.

Regenerate with `python scripts/build-cefr-lexicon.py`; it downloads pinned source files and
verifies their Git blob hashes. No network access or paid API is used during classification.

These lists assign levels to lexical entries, not whole texts, questions or learners. The
application uses an explicitly **uncalibrated heuristic** to suggest an editorial level. It
cannot certify CEFR levels, resolve every word sense, infer all idioms, evaluate answer validity,
or replace pedagogical review. A short trivia question does not measure learner proficiency.
