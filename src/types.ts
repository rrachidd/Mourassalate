export interface Student {
  id?: string;
  ownerId: string;
  massarNumber: string;
  lastName: string;
  firstName: string;
  transferDate: string;
  transferType: "وافد" | "مغادر";
  receivingSchool: string;
  originalSchool: string;
  originalDirectorate: string;
  createdAt?: string;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  email: string;
  schoolName?: string;
  directorate?: string;
  updatedAt?: string;
}

export interface Letter {
  id?: string;
  ownerId: string;
  type: "request_file" | "bulk_list";
  reference: string;
  date: string;
  targetEntity: string;
  subject: string;
  contentArray?: any[];
  createdAt?: string;
}

export interface DirectorateBase {
  name: string;
  type: string;
  region: string;
}
