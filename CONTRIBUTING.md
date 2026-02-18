# Contributing

We love contributions! If you're a developer and want to showcase your portfolio, follow these steps to add it to the gallery.

## How to Add Your Portfolio

1. Fork this repository.
2. Add your details to `data/portfolios.json`:

```json
{
  "name": "Your Name",
  "url": "https://your-portfolio.com",
  "description": "A brief tagline about yourself"
}
```

3. Submit a Pull Request.

### What Happens Next?

Once your PR is merged:

- A GitHub Action will automatically trigger.
- The bot will visit your site and record a high-quality scrolling GIF.
- Your portfolio will be added to the leaderboard in the `README.md` automatically.

## Local Development

If you'd like to run the bot locally to test your submission:

1. Install dependencies:

   ```bash
   npm install
   ```

2. Ensure FFmpeg is installed on your system.
3. Run the bot:
   ```bash
   node bot.js
   ```

The bot will skip existing previews and only generate new ones.
