export const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
      background-color: #f0f0f0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      padding: 24px;
      background-color: #ffffff;
      border: 4px solid #000000;
      box-shadow: 8px 8px 0px 0px #000000;
    }
    .header {
      margin-bottom: 24px;
      border-bottom: 4px solid #000000;
      padding-bottom: 16px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      text-transform: uppercase;
      letter-spacing: -0.05em;
    }
    .footer {
      margin-top: 32px;
      font-size: 14px;
      color: #666666;
      border-top: 2px solid #000000;
      padding-top: 16px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #000000;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: bold;
      border: 2px solid #000000;
      box-shadow: 4px 4px 0px 0px #666666;
      margin: 16px 0;
    }
    .button:hover {
      box-shadow: 2px 2px 0px 0px #666666;
      transform: translate(2px, 2px);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Kyte</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>This is an automated notification from Kyte. You can manage your notification preferences in your account settings.</p>
    </div>
  </div>
</body>
</html>
`
