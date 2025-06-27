import getSkill from "./getSkill";

export interface SkillInterface {
  userID: string;
}

export default class Skills {
  static getByDocument = (document: string) => getSkill(document);
}
