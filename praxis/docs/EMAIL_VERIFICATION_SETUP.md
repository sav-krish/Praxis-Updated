# Email Verification Setup Guide

## Problem
Praxis website's got 
## Solution Options

### Option 1: Disable Email Confirmation (Fastest for Development)
This is the quickest fix for development/testing. Users can log in immediately without verifying their email.

**Steps:**
1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project: `vewnoczsavzyygkhmruo`
3. Go to **Authentication** → **Settings**
4. Scroll down to **Email Auth**
5. **Uncheck** "Enable email confirmations"
6. Click **Save**

**Result:** Users can now log in immediately after signing up without waiting for email verification.

### Option 2: Configure Resend for Fast Email Delivery (Recommended for Production)
This option uses Resend to send verification emails quickly and reliably.

**Steps:**

1. **Get a Resend API Key:**
   - Go to https://resend.com
   - Sign up for a free account
   - Create an API key from the dashboard
   - Copy your API key

2. **Configure Resend in Praxis:**
   - Open `praxis/.env.local`
   - Add these lines (replace with your actual values):
   ```env
   RESEND_API_KEY=re_your-resend-api-key-here
   RESEND_FROM=Praxis <noreply@yourdomain.com>
   ```

3. **Configure Supabase to Use Resend:**
   - Go to Supabase Dashboard
   - Select your project
   - Go to **Authentication** → **Email Templates**
   - Click **Go to settings** (or navigate to **Settings** → **Auth** → **Email**)
   - Under **SMTP Settings**, select **Custom SMTP**
   - Enter these Resend SMTP details:
     ```
     Sender name: Praxis
     Sender email: noreply@yourdomain.com (must match your verified domain in Resend)
     Host: smtp.resend.com
     Port: 587
     Username: resend
     Password: [your-resend-api-key]
     ```
   - Click **Send test email** to verify
   - Click **Save**

**Result:** Verification emails will be sent quickly via Resend.

### Option 3: Use Supabase's Built-in Email (Not Recommended)
Supabase's default email service is slow and emails often go to spam. Only use this if other options aren't available.

## Testing the Fix

After making changes:

1. **Clear your browser cache and cookies**
2. **Try signing up with a new email address**
3. **Check if you can log in immediately** (Option 1) or **receive email quickly** (Option 2)

## Troubleshooting

### Still Slow?
- If using Option 2, check your Resend dashboard for delivery status
- Verify your domain in Resend if emails are going to spam
- Check Supabase logs: Dashboard → **Logs** → filter by "auth"

### Can't Access Supabase Dashboard?
Contact your project administrator or check your Supabase account permissions.

### Environment Variables Not Working?
1. Restart your development server:
   ```bash
   cd praxis
   pnpm dev
   ```
2. Verify `.env.local` is in the correct location (`praxis/.env.local`)
3. Check that variable names are exactly as shown (case-sensitive)

## Current Configuration

Your current `.env.local` has:
- ✅ Gemini API configured correctly
- ✅ Supabase connection configured
- ❌ Resend not configured (emails will be slow or not sent)

## Next Steps

1. Choose either Option 1 (quick fix) or Option 2 (production-ready)
2. Follow the steps above
3. Test by creating a new student account
4. Verify you can log in and access the dashboard

## Additional Notes

- The student dashboard is already implemented and working
- Praxis Copilot has been added to the report pages
- All features from the specs are implemented
- The only issue was email verification speed