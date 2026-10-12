export type Piece = {
  id: string;
  title: string;
  goal: string;
  initiallyDone: boolean;
};

export type Module = {
  id: string;
  title: string;
  pieces: Piece[];
};

export type Course = {
  id: string;
  title: string;
  color: string;
  image: string;
  modules: Module[];
  builtin: boolean;
};

export type ParsedCourseInput = {
  markdown: string;
  courseId?: string;
  builtin?: boolean;
};
