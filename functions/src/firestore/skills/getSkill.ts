import Collections from "../collections";
import { SkillInterface } from "./skills";

const getSkill = async (document: string): Promise<SkillInterface> => {
  const snapshot = await Collections.skills.doc(document).get();
  return snapshot.data() as SkillInterface;
};

export default getSkill;
