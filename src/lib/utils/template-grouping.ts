import type { AnalyzedComponent, TemplateGroup } from "@/lib/types/component";

const findFolder = (
  components: AnalyzedComponent[],
  claimed: Set<number>,
  ownerName: string,
): number =>
  components.findIndex(
    (c, i) =>
      !claimed.has(i) &&
      c.isDatasourceFolder &&
      (c.parentTemplateName === ownerName ||
        c.componentName.includes(ownerName)),
  );

export const buildGroups = (
  components: AnalyzedComponent[],
): TemplateGroup[] => {
  const groups: TemplateGroup[] = [];
  const claimed = new Set<number>();

  // First pass: list parents — claim parent, child, and both folders
  components.forEach((comp, idx) => {
    if (comp.isListComponent && !claimed.has(idx)) {
      const group: TemplateGroup = {
        id: String(idx),
        label: comp.componentName,
        type: "list",
        members: [{ role: "parent", idx }],
        insertOptions: [],
      };
      claimed.add(idx);

      const childIdx = components.findIndex(
        (c, i) =>
          !claimed.has(i) &&
          !c.isListComponent &&
          !c.isDatasourceFolder &&
          (c.parentTemplateName === comp.componentName ||
            comp.childTemplateName === c.componentName),
      );
      if (childIdx !== -1) {
        group.members.push({ role: "child", idx: childIdx });
        claimed.add(childIdx);

        const childFolderIdx = findFolder(
          components,
          claimed,
          components[childIdx].componentName,
        );
        if (childFolderIdx !== -1) claimed.add(childFolderIdx);
      }

      const folderIdx = findFolder(components, claimed, comp.componentName);
      if (folderIdx !== -1) {
        group.members.push({ role: "folder", idx: folderIdx });
        claimed.add(folderIdx);
      }

      const folderName =
        folderIdx !== -1 ? components[folderIdx].componentName : null;
      const childName =
        childIdx !== -1
          ? components[childIdx].componentName
          : comp.childTemplateName;
      const parentFolderName = comp.componentName + "sFolder";
      if (childName && folderName)
        group.insertOptions.push(
          `${childName} → inserted into ${folderName}`,
        );
      group.insertOptions.push(
        `${comp.componentName} → inserted into ${parentFolderName}`,
      );
      if (childName)
        group.insertOptions.push(
          `${comp.componentName}.Items → references ${childName} from $site/Data/${childName}s`,
        );

      groups.push(group);
    }
  });

  // Second pass: standalones (may include a data folder)
  components.forEach((comp, idx) => {
    if (!claimed.has(idx) && !comp.isDatasourceFolder) {
      const group: TemplateGroup = {
        id: String(idx),
        label: comp.componentName,
        type: "standalone",
        members: [{ role: "standalone", idx }],
        insertOptions: [],
      };
      claimed.add(idx);

      const folderIdx = findFolder(components, claimed, comp.componentName);
      if (folderIdx !== -1) {
        group.members.push({ role: "folder", idx: folderIdx });
        claimed.add(folderIdx);
        group.insertOptions.push(
          `${comp.componentName} → datasource stored in ${components[folderIdx].componentName}`,
        );
      }

      groups.push(group);
    }
  });

  // Third pass: any unclaimed folders (orphans)
  components.forEach((comp, idx) => {
    if (!claimed.has(idx)) {
      groups.push({
        id: String(idx),
        label: comp.componentName,
        type: "standalone",
        members: [{ role: "folder", idx }],
        insertOptions: [],
      });
      claimed.add(idx);
    }
  });

  return groups;
};
