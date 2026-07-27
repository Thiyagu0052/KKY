# Silver ERP

Silver ERP is a focused, responsive silver pure-weight ledger for wholesalers and distributors. It uses only HTML5, CSS3, vanilla ES6 JavaScript, and browser LocalStorage—no build tooling or external dependencies required.

## Run

Open `index.html` in a modern browser. For ES module support and consistent browser behavior, serve the folder using any static web server, for example `npx serve SilverERP`.

## Common online data and Android app

The project now supports Firebase for a common shared register and a PWA manifest for Android installation. Create a Firebase project, enable Firestore and Storage, and update the Firebase config values in `js/config.js`. Deploy the folder to HTTPS hosting. On Android Chrome, open the hosted site and choose **Install app**; entries, photos, and pure totals will be shared across all configured devices.

## Included modules

- Dashboard with consolidated pure delivery, pure return, and in-hold totals
- Silver Delivery & Return Register
- Shops master
- Searchable tables, responsive mobile navigation, validated modal forms, confirmation dialogs, and notifications

## Pure calculation

All records persist under the `silver-erp-v1` LocalStorage key. The pure weight is calculated automatically:

- **Delivery:** `Weight × (Touch + 11 Kooli) ÷ 100`
- **Return Kacha:** `Weight × Touch ÷ 100`
- **In Hold:** total delivery pure − total return pure

The starter register contains the supplied Sri Raja Jewellers entries: 4,840.4 g delivery pure, 3,351.5 g return pure, and 1,488.9 g in hold.

## Structure

```
SilverERP/
├── index.html
├── css/style.css
├── js/app.js
├── js/store.js
├── pages/        # Reserved for future standalone route templates
├── assets/       # Reserved for brand exports
├── components/   # Shared components are rendered by app.js
├── data/         # Imported/exported backups can be stored here
└── README.md
```
