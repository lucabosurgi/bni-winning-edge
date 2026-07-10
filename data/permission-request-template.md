# Logo & photo permission request

Use this when asking each member to approve their profile before it goes live.
Personalize the **bold** bits. Keep it short — it doubles as a soft launch that
gets members invested.

---

**Subject: Your free profile on our new BNI Winning Edge website**

Hi **[First Name]**,

We're building a brand-new website for BNI Winning Edge — a searchable directory
where the public can find every member of our chapter, each with their own
dedicated page. It even has an AI "concierge" that points visitors to the right
member when they need a trade, so it should send real referrals our way.

I've put together a page for **[Business Name]** using the details from your
website, including your logo. Before we publish it, I want your OK.

👉 **Here's your preview:** [link to their /members/<slug> page]

Could you reply with:

1. **Your logo attached** — ideally a PNG with a transparent or white background
   (and a photo/headshot too, if you'd like one on your page), and
2. **"Approved"** — plus any changes to the wording or contact details, which
   also confirms we can use your logo and photos on the site.

That's it — once you approve, your page goes live and starts working for you.

That's it — once you approve, your page goes live and starts working for you.

Thanks,
**Luca**

---

## Tracking

Log each response in `members.csv`:
- `permission_requested` → `y` when you send this
- `permission_granted` → `y` when they approve
- `published` → `y` once you flip their `published` flag to `true` in Supabase

Members who haven't replied stay unpublished, so nothing goes live without a yes.
