import type { AnalyzedComponent } from "@/lib/types/component";

export const DEV_COMPONENTS: AnalyzedComponent[] = [
  {
    componentName: "ArticleFeature",
    description: "A prominent article display with a headline, image, summary, and link.",
    visualLocation: "Left and center of the page",
    isListComponent: false,
    childTemplateName: null,
    isDatasourceFolder: false,
    parentTemplateName: null,
    fields: [
      { name: "Headline", displayName: "Headline", type: "Single-Line Text", description: "Main headline of the article", required: true, source: "" },
      { name: "Summary", displayName: "Summary", type: "Multi-Line Text", description: "Brief summary of the article", required: true, source: "" },
      { name: "Image", displayName: "Image", type: "Image", description: "Main image associated with the article", required: true, source: "" },
      { name: "PublishTime", displayName: "Publish Time", type: "Datetime", description: "Time when the article was published", required: false, source: "" },
      { name: "ArticleLink", displayName: "Article Link", type: "General Link", description: "Link to the full article", required: false, source: "" },
    ],
    variants: [
      { name: "Default", description: "Standard appearance with image on the right" },
      { name: "NoImage", description: "Variant without an image" },
    ],
    sxaStyles: [
      { name: "ImagePosition", options: ["Right", "Left"], description: "Controls the position of the image relative to the text" },
    ],
    suggestions: "Allow customization of image visibility through variants.",
  },
];
