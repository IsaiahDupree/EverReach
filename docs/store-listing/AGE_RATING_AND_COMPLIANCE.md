# Age Rating & Export Compliance — Pre-filled Answers

Use these answers when filling out the App Store Connect and Google Play questionnaires.

---

## Apple — Age Rating Questionnaire

These answers determine the app's age rating (4+, 9+, 12+, 17+).

| Question | Answer | Notes |
|----------|--------|-------|
| Cartoon or Fantasy Violence | None | No violence of any kind |
| Realistic Violence | None | |
| Sexual Content or Nudity | None | |
| Profanity or Crude Humor | None | |
| Alcohol, Tobacco, or Drug Use | None | |
| Simulated Gambling | None | |
| Horror/Fear Themes | None | |
| Mature/Suggestive Themes | None | |
| Medical/Treatment Information | None | |
| Unrestricted Web Access | No | App uses WebView for billing/auth redirects only |
| Gambling and Contests | No | |

**Expected Rating: 4+**

---

## Apple — Export Compliance

| Question | Answer | Notes |
|----------|--------|-------|
| Does your app use encryption? | Yes | Standard HTTPS/TLS only |
| Does your app qualify for any encryption exemptions? | Yes | Uses only standard OS-provided encryption (HTTPS) |
| Is your app available in France? | Yes | Standard exemption applies |
| Does your app contain, access, implement, or call any encryption other than the standard? | No | Only HTTPS via OS networking stack |

**Action**: Select "Yes, the app qualifies for an exemption" → check "The app uses only standard encryption (HTTPS/TLS)."

After first submission, set `ITSAppUsesNonExemptEncryption = NO` in `app.json` to skip this question on future builds:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
    }
  }
}
```

---

## Apple — Content Rights

| Question | Answer |
|----------|--------|
| Does your app contain, show, or access third-party content? | No |
| Do you have the rights to all content? | Yes |

---

## Google Play — Content Rating (IARC)

| Question | Answer |
|----------|--------|
| Violence | No |
| Sexuality | No |
| Language | No |
| Controlled substances | No |
| Interactive elements: Users interact | No (CRM is personal, not social) |
| Interactive elements: Shares info | No |
| Interactive elements: Shares location | No |
| Interactive elements: Digital purchases | Yes (subscriptions via IAP) |

**Expected Rating: Everyone / PEGI 3 / USK 0**

---

## Google Play — Data Safety

| Category | Collected | Shared | Purpose |
|----------|-----------|--------|---------|
| Email address | Yes | Yes (Meta, with consent) | App functionality, Advertising |
| Name | Yes | Yes (Meta, with consent) | App functionality, Advertising |
| Phone number | Yes (optional) | Yes (Meta, with consent) | App functionality, Advertising |
| Contacts | Yes | No | App functionality |
| Photos | Yes | No | App functionality |
| Audio (voice notes) | Yes | No | App functionality |
| App interactions | Yes | No | Analytics |
| Purchase history | Yes | No | App functionality |
| Device identifiers | Yes | Yes (Meta, with consent) | Advertising |
| Crash logs | Yes | No | Diagnostics |

**Security practices:**
- Data encrypted in transit: Yes
- Users can request data deletion: Yes
- Data not sold to third parties: Yes

---

## Checklist

- [ ] Complete Apple Age Rating questionnaire (expected: 4+)
- [ ] Complete Apple Export Compliance (standard HTTPS exemption)
- [ ] Add `ITSAppUsesNonExemptEncryption: false` to app.json after first submission
- [ ] Complete Google Play IARC content rating
- [ ] Complete Google Play Data Safety form
