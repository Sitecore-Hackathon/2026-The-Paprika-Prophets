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
          "required": false,
          "source": ""
        },
        {
          "name": "Items",
          "displayName": "Items",
          "type": "Treelist",
          "description": "References to CaseStudyCard items.",
          "required": true,
          "source": "query:./*"
        }
      ],
      "variants": [
        {
          "name": "Default",
          "description": "Standard appearance"
        }
      ],
      "sxaStyles": [],
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
          "required": true,
          "source": ""
        },
        {
          "name": "CompanyName",
          "displayName": "Company Name",
          "type": "Single-Line Text",
          "description": "Name of the company.",
          "required": true,
          "source": ""
        },
        {
          "name": "Headline",
          "displayName": "Headline",
          "type": "Single-Line Text",
          "description": "Main headline for the case study.",
          "required": true,
          "source": ""
        },
        {
          "name": "Description",
          "displayName": "Description",
          "type": "Multi-Line Text",
          "description": "Brief description of the case study.",
          "required": true,
          "source": ""
        }
      ],
      "variants": [
        {
          "name": "Default",
          "description": "Standard card layout"
        }
      ],
      "sxaStyles": [],
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
      "variants": [],
      "sxaStyles": [],
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
          "required": true,
          "source": ""
        },
        {
          "name": "Subheadline",
          "displayName": "Sub-headline",
          "type": "Single-Line Text",
          "description": "Supporting text beneath the headline.",
          "required": false,
          "source": ""
        },
        {
          "name": "BackgroundImage",
          "displayName": "Background Image",
          "type": "Image",
          "description": "Full-width background image.",
          "required": false,
          "source": ""
        },
        {
          "name": "CtaLink",
          "displayName": "CTA Link",
          "type": "General Link",
          "description": "Primary call-to-action button link.",
          "required": false,
          "source": ""
        }
      ],
      "variants": [
        { "name": "Default", "description": "Standard full-width hero" },
        { "name": "Centered", "description": "Centered text layout" }
      ],
      "sxaStyles": [],
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
      "variants": [],
      "sxaStyles": [],
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

