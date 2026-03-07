import type { AnalyzedComponent, TemplateGroup } from "@/lib/types/component";

export const DEV_COMPONENTS: AnalyzedComponent[] = [
    {
      "componentName": "CaseStudiesList",
      "description": "Section displaying case studies from various brands.",
      "visualLocation": "Center Page",
      "isListComponent": true,
      "childTemplateName": "CaseStudyCard",
      "isDatasourceFolder": false,
      "parentTemplateName": null,
      "fields": [
        {
          "name": "SectionTitle",
          "displayName": "Section Title",
          "type": "Single-Line Text",
          "description": "The title for the case studies section.",
          "source": ""
        },
        {
          "name": "Items",
          "displayName": "Items",
          "type": "Treelist",
          "description": "References to CaseStudyCard items.",
          "source": "query:./*"
        }
      ],
      "suggestions": "Ensure that the section heading is customizable."
    },
    {
      "componentName": "CaseStudyCard",
      "description": "A single card displaying a case study with logo, title, and description.",
      "visualLocation": "Within the CaseStudiesList",
      "isListComponent": false,
      "childTemplateName": null,
      "isDatasourceFolder": false,
      "parentTemplateName": "CaseStudiesList",
      "fields": [
        {
          "name": "Logo",
          "displayName": "Logo",
          "type": "Image",
          "description": "Logo of the company.",
          "source": ""
        },
        {
          "name": "CompanyName",
          "displayName": "Company Name",
          "type": "Single-Line Text",
          "description": "Name of the company.",
          "source": ""
        },
        {
          "name": "Headline",
          "displayName": "Headline",
          "type": "Single-Line Text",
          "description": "Main headline for the case study.",
          "source": ""
        },
        {
          "name": "Description",
          "displayName": "Description",
          "type": "Multi-Line Text",
          "description": "Brief description of the case study.",
          "source": ""
        }
      ],
      "suggestions": "Consider making the entire card clickable with a link to the full case study."
    },
    {
      "componentName": "CaseStudyCardsFolder",
      "description": "Folder to store case study card data.",
      "visualLocation": "Backend Data Structure",
      "isListComponent": false,
      "childTemplateName": null,
      "isDatasourceFolder": true,
      "parentTemplateName": "CaseStudiesList",
      "fields": [],
      "suggestions": "Organize case study cards within this folder."
    },
    {
      "componentName": "HeroBanner",
      "description": "Full-width hero banner with headline, sub-headline, and a CTA button.",
      "visualLocation": "Top of Page",
      "isListComponent": false,
      "childTemplateName": null,
      "isDatasourceFolder": false,
      "parentTemplateName": null,
      "fields": [
        {
          "name": "Headline",
          "displayName": "Headline",
          "type": "Single-Line Text",
          "description": "Primary headline text.",
          "source": ""
        },
        {
          "name": "Subheadline",
          "displayName": "Sub-headline",
          "type": "Single-Line Text",
          "description": "Supporting text beneath the headline.",
          "source": ""
        },
        {
          "name": "BackgroundImage",
          "displayName": "Background Image",
          "type": "Image",
          "description": "Full-width background image.",
          "source": ""
        },
        {
          "name": "CtaLink",
          "displayName": "CTA Link",
          "type": "General Link",
          "description": "Primary call-to-action button link.",
          "source": ""
        }
      ],
      "suggestions": "Consider adding a dark/light overlay toggle for the background image."
    },
    {
      "componentName": "HeroBannersFolder",
      "description": "Folder to store HeroBanner datasource items.",
      "visualLocation": "Backend Data Structure",
      "isListComponent": false,
      "childTemplateName": null,
      "isDatasourceFolder": true,
      "parentTemplateName": "HeroBanner",
      "fields": [],
      "suggestions": "Organizes hero banner content items per page or section."
    }
];

export const DEV_GROUPS: TemplateGroup[] = [
  {
    id: "HeroBanner",
    label: "HeroBanner",
    type: "standalone",
    members: [
      { role: "standalone", idx: 3 },
      { role: "folder", idx: 4 },
    ],
    insertOptions: [
      "HeroBanner \u2192 inserted into HeroBannersFolder",
    ],
  },
  {
    id: "CaseStudiesList",
    label: "CaseStudiesList",
    type: "list",
    members: [
      { role: "parent", idx: 0 },
      { role: "child", idx: 1 },
      { role: "folder", idx: 2 },
    ],
    insertOptions: [
      "CaseStudyCard \u2192 inserted into CaseStudyCardsFolder",
      "CaseStudiesList \u2192 inserted into CaseStudiesListsFolder",
      "CaseStudiesList.Items \u2192 references CaseStudyCard from $site/Data/CaseStudyCards",
    ],
  },
];

