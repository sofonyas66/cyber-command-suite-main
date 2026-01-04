# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Supabase (auth & database) setup

- Copy the example env file and fill in your Supabase project values:

```bash
cp .env.example .env
# then edit .env and set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
```

- Where to get values:
	- `VITE_SUPABASE_URL` is available in the Supabase project settings (the project URL).
	- `VITE_SUPABASE_PUBLISHABLE_KEY` is your anon/public key from Supabase > Settings > API.

- After setting the values, start the dev server:

```bash
npm install
npm run dev
```

- Notes:
	- Never commit real secret keys. Keep service-role keys out of client-side envs.
	- The app reads env vars named `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Splunk webhook & functions

- The repository includes an Edge Function to receive Splunk webhooks at `supabase/functions/splunk-webhook`.
- That function requires a Supabase service role key in its runtime environment. Set the server env var `SUPABASE_SERVICE_ROLE_KEY` in your deployment (do not expose this key to clients).
- Locally, you can set `SUPABASE_SERVICE_ROLE_KEY` in your shell before running the Supabase local emulator or deploying functions.

### Quick deploy notes

1. Create the database/tables by applying migrations in the `supabase/migrations` directory to your Supabase project.
2. Deploy functions (or run the local Supabase emulation) and set `SUPABASE_SERVICE_ROLE_KEY` in the function environment.
3. Add an integration in the UI and copy the webhook URL from the integration modal; configure that in Splunk alerts.

If you want, I can add a small script to help deploy migrations and functions locally — should I add that next?
