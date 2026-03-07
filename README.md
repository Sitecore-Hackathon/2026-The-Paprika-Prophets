![Hackathon Logo](docs/images/hackathon.png?raw=true "Hackathon Logo")
# Sitecore Hackathon 2026

![Logo](logo.png)
  
## Team name
⟹ The Paprika Prophets

## Category
⟹ Best Marketplace App for Sitecore AI

## Description
**Component Forge** is a Sitecore Marketplace app that dramatically accelerates component development in SitecoreAI. While AI-powered code generation tools are widely available today, scaffolding the Sitecore side — templates, renderings, variants, styles, and demo content — remains a tedious, manual process. Component Forge bridges that gap: it analyzes screenshots or HTML of your design, generates complete Sitecore item definitions, and produces Content SDK–compatible Next.js component code ready to paste into your codebase. From design to working component in minutes — not hours — with a human in the loop.

### Component Forge Features

- **AI-powered component recognition** — Analyze a screenshot or HTML snippet to automatically identify one or more components, their fields, variants, and SXA styles.
- **Iterative analysis refinement** — Fine-tune and replay the analysis phase to improve template, variant, and styling outcomes before committing to Sitecore.
- **Full Sitecore item creation** — Create all necessary Sitecore items in one step: templates, renderings, sample data, and a sample page — powered by the Agent API.
- **Content SDK code generation** — Generate production-ready Next.js component code compatible with `@sitecore-content-sdk/nextjs`, with copy-pastable terminal commands for quick scaffolding into your repository.
- **Split model selection** — Choose different AI models for analysis and code generation independently, so you can use the best-suited model for each task (e.g. a vision model for analysis, a coding model for generation).
- **Audit logging** — Track every AI call and generation step with detailed run logs stored in Sitecore for review and transparency.

## Video link
⟹ Provide a video highlighing your Hackathon module submission and provide a link to the video. You can use any video hosting, file share or even upload the video to this repository. _Just remember to update the link below_

⟹ [Replace this Video link](#video-link)

## Pre-requisites and Dependencies

- **Sitecore AI** (formerly XM Cloud) — the app is built for Sitecore AI and requires an active environment.
- **OpenAI API key** — required for AI-powered screenshot/HTML analysis and code generation.

> **Judges:** If you need a test API key, please reach out to **Mihály** and one will be provided.

## Installation instructions

### Obtain OpenAI API Key 

OpenAI API Key is needed in the configuration section in order to communicate with OpenAI models.

1. Go to [platform.openai.com](https://platform.openai.com/) and sign in (or create an account).
2. Navigate to **API Keys** in the left sidebar.
3. Click **Create new secret key**, give it a name, and copy the key.
4. You will enter this key in the app's Settings dialog when prompted.

### Set up a Marketplace App in Sitecore AI

1. In the Sitecore Portal, navigate to **Marketplace** and create a new **Custom App**.

   ![Create Custom App](docs/images/marketplace-setup/1_marketplace_custom_app.png?raw=true "Create Custom App")

2. Configure the following **API Access** for the app.

   ![API Access](docs/images/marketplace-setup/2_marketplace_api_access.png?raw=true "API Access")

3. Set the required **Permissions**.

   ![Permissions](docs/images/marketplace-setup/3_marketplace_permission.png?raw=true "Permissions")

4. Enter the **App URL** and upload an icon/image.

   > **Tip:** You can use our hosted demo on Vercel directly — set the App URL to `https://2026-the-paprika-prophets.vercel.app/` and skip the local setup section below.

   ![App URL & Image](docs/images/marketplace-setup/4_marketplace_url_img.png?raw=true "App URL & Image")

5. Go to **My Apps** to verify the app is registered.

   ![My Apps](docs/images/marketplace-setup/5_myapps.png?raw=true "My Apps")

6. Click **Install** to add the app to your environment. You can choose multiple tenants

   ![Install](docs/images/marketplace-setup/6_install.png?raw=true "Install")

### Run the solution locally

> **Note:** If you configured the Vercel URL (`https://2026-the-paprika-prophets.vercel.app/`) as the App URL in the Marketplace setup, you can skip this section entirely.

1. Clone the repository:
   ```bash
   git clone https://github.com/Sitecore-Hackathon/2026-The-Paprika-Prophets.git
   cd 2026-The-Paprika-Prophets
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. The app runs on **http://localhost:3000** by default. Make sure this matches the App URL you configured in the Marketplace setup.

### Configuration

When a tenant is used for the first time, the app launches an **Installation Wizard** that guides you through configuration. On subsequent launches, the wizard is skipped and the app opens directly.

1. On first start, the Installation Wizard is displayed automatically.

   ![First Start](docs/images/marketplace-setup/7_first_start.png?raw=true "First Start")

2. The wizard walks you through the installation process — follow the on-screen steps.

   ![Installation Process](docs/images/marketplace-setup/8_installation_process.png?raw=true "Installation Process")

3. Enter your **OpenAI API Key** and select the AI models you want to use for analysis and code generation.

   ![Set OpenAI API Key](docs/images/marketplace-setup/9_set_openai_apikey.png?raw=true "Set OpenAI API Key")

4. Confirm your settings. These can be changed later via the **Settings** dialog in the app.

   ![Confirm Settings](docs/images/marketplace-setup/10_set_openai_apikey.png?raw=true "Confirm Settings")

## Usage instructions
 (TODO FILL IT LATER WHEN FULL FLOW IS IN PACE)

## Comments

### Further Improvements

- **Server-side Sitecore access:** Currently the OpenAI API Key is fetched via the Client SDK and forwarded to custom API routes as a request header. This mirrors the Custom Authorization pattern recommended by the Marketplace SDK (where access tokens are passed from client to server via headers). A future improvement would be to enable the Experimental Sitecore Server Client in the API routes, allowing direct Sitecore CM calls server-side and removing the need to pass the OpenAI key through the browser — even though it's already protected by built-in authorization.
- **Enhanced logging:** Logging is currently stored as Sitecore items under a simplified Run/RunStep structure. We explored using external storage (e.g. Supabase, Vercel KV) for richer audit trails and better query capabilities, but opted against it to keep the setup simple and avoid adding extra dependencies for judges.
- **Figma integration:** Importing designs directly from Figma was on our roadmap, but we prioritized the screenshot and HTML analysis flows first. Figma's free-tier API rate limits made exploration impractical within the hackathon timeframe.
- **Multi-provider AI support:** The app currently uses OpenAI exclusively. A natural next step would be to add support for other providers such as Google Gemini and Anthropic Claude, giving users the flexibility to choose the model that best fits their needs and budget.
