# Dream Deployer Ai

naku ai career assistance platform use cheddam anukuntunna ee 5 functionalities implement cheyali ee website kihtml,css, react.js,java springboot,mysql use chesi evvu ee website ki functionality work ayyela vundali vetini base cheskoni website build chesi evvu

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/019a9727-2fda-4a77-a3af-3bfd49b15904).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Configure AI features

The resume analyzer, career guidance, mock interview, and skill-gap roadmap use Google's Gemini API from server-side code.

1. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/app/apikey).
2. In the project-root `.env`, add `GEMINI_API_KEY=your_gemini_api_key`. If you do not have a `.env` yet, copy `.env.example` and fill in your Supabase project values too. Keep the Gemini key server-side: do not rename it to `VITE_GEMINI_API_KEY`, put it in browser code, or share it.
3. Stop and restart the development server after changing `.env`:

   ```sh
   npm run dev
   ```

4. Sign in and try each feature:
   - **Resume analysis:** open Resume Analyzer, upload a text-based PDF, and optionally paste a job description.
   - **Career guidance:** fill in and save your skills, interests, education, and career goal in Profile, then request career paths.
   - **Interview preparation:** choose or enter a role, optionally enter technologies, generate questions, and submit answers for AI feedback.
   - **Skill-gap analysis:** open Learning Roadmap, enter a target role, and build a plan based on your saved profile.

The server reports a clear setup error if `GEMINI_API_KEY` is missing. Gemini API errors and PDF extraction errors are surfaced separately. `.env` is excluded from source control; never commit API keys.
Resume analysis, career guidance, and mock interviews use the shared server-side Gemini model list; Roadmap uses its own listed Flash model candidates. All four features use the same server-side `GEMINI_API_KEY` and therefore its Google project quota. Model candidates are not changed automatically based on credentials.
Transient rate limits receive at most one automatic retry. The server honors Gemini's `Retry-After`/retry-delay value when it is no more than five minutes; longer waits are returned without retrying. Quota exhaustion and authentication errors are returned immediately with a clear message. Server logs include the HTTP status, model, and a redacted, truncated provider error detail to help distinguish quota, model, and authentication failures without logging the API key or request content.
