export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type ReserveRow = {
  id: string; level_id: string | null; content_key: string; prompt: string; choices: Json; correct_answer: string;
  explanation: string; hint: string; source: "manual" | "opentdb" | "trivia";
  source_url: string; source_title: string; source_license: string; category: string;
  status: "pending" | "available" | "archived"; created_by: string | null; updated_by: string | null;
  created_at: string; updated_at: string;
};
type ReplacementProjection = { question_id: string; prompt: string; choices: Json; source_url: string; source_title: string; source_license: string; origin: string };

export type Database = {
  public: {
    Tables: {
      lesson_completions: Table<{user_id:string;lesson_id:string;completed_at:string},never,never>;
      lesson_runs: Table<{id:string;user_id:string;lesson_id:string;question_ids:string[];answers:Json;passed:boolean;created_at:string;finished_at:string|null},never,never>;
      student_feedback: Table<{ id: string; user_id: string; request_id: string; message: string; created_at: string }, never, never>;
      flashcard_progress: Table<{ user_id: string; card_id: string; rating: "remembered" | "review"; updated_at: string }, { user_id: string; card_id: string; rating: "remembered" | "review" }, { rating: "remembered" | "review" }>;

      question_reserve: Table<
        ReserveRow,
        Omit<ReserveRow, "id" | "created_at" | "updated_at" | "content_key"> & { id?: string; updated_at?: string },
        Partial<Omit<ReserveRow, "id" | "created_at" | "content_key">>
      >;
      question_replacement_searches: Table<
        { id: string; user_id: string; question_id: string; level_id: string; created_at: string; finished_at: string | null },
        never,
        { finished_at: string }
      >;
      languages: Table<
        {
          id: string;
          code: string;
          name: string;
          created_at: string;
        },
        {
          id?: string;
          code: string;
          name: string;
        },
        never
      >;
      profiles: Table<
        {
          user_id: string;
          display_name: string;
          current_level_id: string | null;
          learning_goal: string;
          daily_goal_minutes: number;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          user_id: string;
          display_name?: string;
          current_level_id?: string | null;
          learning_goal?: string;
          daily_goal_minutes?: number;
          onboarding_completed?: boolean;
        },
        {
          display_name?: string;
          learning_goal?: string;
          daily_goal_minutes?: number;
          onboarding_completed?: boolean;
        }
      >;
      language_levels: Table<
        {
          id: string;
          language_id: string;
          code: string;
          title: string;
          sort_order: number;
          created_at: string;
        },
        {
          id?: string;
          language_id: string;
          code: string;
          title: string;
          sort_order: number;
        },
        {
          title?: string;
          sort_order?: number;
        }
      >;
      lessons: Table<
        {
          id: string;
          level_id: string;
          slug: string;
          title: string;
          description: string;
          category: string;
          duration_minutes: number;
          sort_order: number;
          is_published: boolean;
          created_at: string;
        },
        {
          id?: string;
          level_id: string;
          slug: string;
          title: string;
          description: string;
          category: string;
          duration_minutes: number;
          sort_order: number;
          is_published?: boolean;
        },
        {
          title?: string;
          description?: string;
          category?: string;
          duration_minutes?: number;
          sort_order?: number;
          is_published?: boolean;
        }
      >;
      questions: Table<
        {
          id: string;
          lesson_id: string;
          question_type: "multiple_choice" | "fill_blank" | "listening" | "word_order";
          prompt: string;
          reading_passage?: string | null;
          choices: Json;
          audio_path: string | null;
          sort_order: number;
          difficulty: "easy" | "intermediate" | "hard";
          is_published: boolean;
          created_at: string;
        },
        {
          id?: string;
          lesson_id: string;
          question_type: "multiple_choice" | "fill_blank" | "listening" | "word_order";
          prompt: string;
          reading_passage?: string | null;
          choices?: Json;
          audio_path?: string | null;
          sort_order: number;
          difficulty?: "easy" | "intermediate" | "hard";
          is_published?: boolean;
        },
        {
          lesson_id?: string;
          question_type?: "multiple_choice" | "fill_blank" | "listening" | "word_order";
          prompt?: string;
          reading_passage?: string | null;
          choices?: Json;
          audio_path?: string | null;
          sort_order?: number;
          difficulty?: "easy" | "intermediate" | "hard";
          is_published?: boolean;
        }
      >;
      question_answers: Table<
        {
          question_id: string;
          accepted_answers: string[];
          explanation: string;
        },
        {
          question_id: string;
          accepted_answers: string[];
          explanation?: string;
        },
        {
          accepted_answers?: string[];
          explanation?: string;
        }
      >;
      question_attempts: Table<
        {
          id: string;
          user_id: string;
          question_id: string;
          submitted_answer: string;
          is_correct: boolean;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          question_id: string;
          submitted_answer: string;
          is_correct: boolean;
        },
        never
      >;
      vocabulary_cards: Table<
        {
          id: string;
          level_id: string;
          front: string;
          back: string;
          pronunciation: string;
          sort_order: number;
          is_published: boolean;
        },
        {
          id?: string;
          level_id: string;
          front: string;
          back: string;
          pronunciation?: string;
          sort_order: number;
          is_published?: boolean;
        },
        never
      >;
      learning_videos: Table<
        {
          id: string;
          level_id: string;
          title: string;
          duration_seconds: number;
          video_url: string;
          is_published: boolean;
          created_at: string;
        },
        {
          id?: string;
          level_id: string;
          title: string;
          duration_seconds: number;
          video_url: string;
          is_published?: boolean;
        },
        {
          title?: string;
          duration_seconds?: number;
          video_url?: string;
          is_published?: boolean;
        }
      >;
      proficiency_questions: Table<
        {
          id: string;
          level_id: string;
          sort_order: number;
          prompt: string;
          choices: Json;
          correct_option: number;
          is_published: boolean;
        },
        {
          id?: string;
          level_id: string;
          sort_order: number;
          prompt: string;
          choices: Json;
          correct_option: number;
          is_published?: boolean;
        },
        never
      >;
      proficiency_exam_sessions: Table<
        {
          id: string;
          user_id: string;
          exam_type: "placement" | "promotion";
          source_level_id: string | null;
          question_ids: string[];
          recommended_level_id: string | null;
          score: number | null;
          passed: boolean | null;
          created_at: string;
          completed_at: string | null;
        },
        never,
        never
      >;
    };
    Views: {
      published_lesson_questions: {
        Row: {
          lesson_id: string;
          lesson_slug: string;
          lesson_title: string;
          lesson_description: string;
          lesson_category: string;
          duration_minutes: number;
          lesson_sort_order: number;
          level_code: string;
          level_title: string;
          question_id: string;
          question_type: "multiple_choice" | "fill_blank" | "listening" | "word_order";
          prompt: string;
          reading_passage?: string | null;
          choices: Json;
          audio_path: string | null;
          question_sort_order: number;
          difficulty: "easy" | "intermediate" | "hard";
          hint: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      admin_set_questions_published: {Args:{p_ids:string[];p_published:boolean};Returns:number};
      start_lesson_run: {Args:{p_lesson_id:string};Returns:Json};
      submit_lesson_run_answer: {Args:{p_run_id:string;p_question_id:string;p_submitted_answer:string};Returns:Json};
      submit_student_feedback: { Args: { p_message: string; p_request_id: string }; Returns: string };
      get_student_feedback: { Args: { p_offset: number; p_limit: number }; Returns: Json };

      assign_reserve_question: { Args: { p_question_id: string }; Returns: ReplacementProjection[] };
      get_question_reserve_counts: { Args: Record<PropertyKey, never>; Returns: { level_code: string; pending: number; available: number; archived: number }[] };
      get_my_question_replacements: { Args: Record<PropertyKey, never>; Returns: ReplacementProjection[] };
      reserve_question_replacement_search: {
        Args: { p_user_id: string; p_question_id: string };
        Returns: { request_id: string; level_code: string; lesson_title: string }[];
      };
      save_question_replacement: {
        Args: { p_request_id: string; p_prompt: string; p_choices: Json; p_correct_option: number; p_explanation: string; p_hint: string; p_source_url: string; p_source_title: string };
        Returns: undefined;
      };
      admin_update_user_profile: {
        Args: {
          p_user_id: string;
          p_display_name: string;
          p_level_id: string | null;
          p_learning_goal: string;
          p_daily_goal_minutes: number;
        };
        Returns: undefined;
      };
      admin_reset_user_progress: {
        Args: {
          p_user_id: string;
        };
        Returns: undefined;
      };
      apply_placement_level: {
        Args: {
          p_level_code: string;
        };
        Returns: undefined;
      };
      complete_onboarding: {
        Args: {
          p_level_code: string;
          p_learning_goal: string;
          p_daily_goal_minutes: number;
        };
        Returns: undefined;
      };
      submit_question_answer: {
        Args: {
          p_question_id: string;
          p_submitted_answer: string;
        };
        Returns: {
          is_correct: boolean;
          explanation: string;
          level_completed: boolean;
          wrong_attempts: number;
          hint: string | null;
        }[];
      };
      get_proficiency_exam: {
        Args: {
          p_exam_type: "placement" | "promotion";
        };
        Returns: {
          exam_id: string;
          question_id: string;
          level_code: string;
          prompt: string;
          choices: Json;
          question_number: number;
          question_count: number;
        }[];
      };
      get_listening_transcript: {
        Args: {
          p_question_id: string;
        };
        Returns: string;
      };
      submit_proficiency_exam: {
        Args: {
          p_exam_id: string;
          p_answers: number[];
        };
        Returns: {
          exam_type: string;
          score: number;
          passed: boolean;
          recommended_level: string | null;
          advanced_level: string | null;
          a1_score: number;
          a2_score: number;
          b1_score: number;
          b2_score: number;
          c1_score: number;
          c2_score: number;
        }[];
      };
      submit_placement_test: {
        Args: {
          p_answers: number[];
        };
        Returns: {
          recommended_level: string;
          a1_score: number;
          a2_score: number;
          b1_score: number;
          b2_score: number;
          c1_score: number;
          c2_score: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
