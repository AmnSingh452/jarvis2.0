/**
 * App Installation Landing Page with Referral Tracking
 * Handles: https://your-app.com/install?ref=AGENCY_ABC
 * Captures referral codes and stores them for OAuth callback
 */

import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import prisma from "../db.server";

export async function loader({ request }) {
  const url = new URL(request.url);
  const ref = url.searchParams.get("ref");
  const shop = url.searchParams.get("shop");
  
  let agency = null;
  let referralValid = false;
  
  // Validate referral code if provided
  if (ref) {
    try {
      agency = await prisma.agency.findUnique({
        where: { referralCode: ref },
        select: {
          id: true,
          name: true,
          active: true,
        },
      });
      
      if (agency && agency.active) {
        referralValid = true;
        console.log(`✅ Valid referral code: ${ref} (${agency.name})`);
      } else {
        console.log(`⚠️ Invalid or inactive referral code: ${ref}`);
      }
    } catch (error) {
      console.error('Error validating referral code:', error);
    }
  }
  
  // If shop is provided, redirect to auth with ref parameter
  if (shop) {
    const authUrl = `/auth?shop=${shop}${ref ? `&ref=${ref}` : ''}`;
    console.log(`🔄 Redirecting to OAuth: ${authUrl}`);
    return redirect(authUrl);
  }
  
  return json({
    referralCode: ref || null,
    agencyName: agency?.name || null,
    hasValidReferral: referralValid,
    appName: "Jarvis 2.0",
  });
}

export default function Install() {
  const { referralCode, agencyName, hasValidReferral, appName } = useLoaderData();
  
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Install {appName}</h1>
        
        {hasValidReferral && (
          <div style={styles.referralBadge}>
            <div style={styles.badgeIcon}>✨</div>
            <div>
              <p style={styles.badgeTitle}>
                Referred by: <strong>{agencyName}</strong>
              </p>
              <p style={styles.badgeSubtext}>
                You'll receive dedicated partner support!
              </p>
            </div>
          </div>
        )}
        
        {!hasValidReferral && referralCode && (
          <div style={styles.errorBadge}>
            <p style={styles.errorText}>
              ⚠️ Invalid or expired referral code
            </p>
          </div>
        )}
        
        <p style={styles.description}>
          Enter your Shopify store URL to get started with AI-powered customer support
        </p>
        
        <Form method="get" action="/install" style={styles.form}>
          {referralCode && (
            <input type="hidden" name="ref" value={referralCode} />
          )}
          
          <div style={styles.inputGroup}>
            <label htmlFor="shop" style={styles.label}>
              Store URL
            </label>
            <input
              id="shop"
              type="text"
              name="shop"
              placeholder="mystore.myshopify.com"
              required
              style={styles.input}
            />
          </div>
          
          <button type="submit" style={styles.button}>
            Install {appName}
          </button>
        </Form>
        
        <div style={styles.footer}>
          <p style={styles.footerText}>
            By installing, you agree to our Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: '24px',
    textAlign: 'center',
  },
  referralBadge: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  badgeIcon: {
    fontSize: '2rem',
  },
  badgeTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    margin: '0 0 8px 0',
  },
  badgeSubtext: {
    fontSize: '0.9rem',
    margin: 0,
    opacity: 0.9,
  },
  errorBadge: {
    background: '#fee',
    border: '2px solid #f88',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  errorText: {
    color: '#c00',
    margin: 0,
    fontSize: '0.95rem',
  },
  description: {
    fontSize: '1.05rem',
    color: '#4a5568',
    textAlign: 'center',
    marginBottom: '32px',
    lineHeight: '1.6',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#2d3748',
  },
  input: {
    padding: '14px 16px',
    fontSize: '1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    transition: 'border-color 0.2s',
    outline: 'none',
  },
  button: {
    padding: '16px',
    fontSize: '1.1rem',
    fontWeight: '600',
    color: 'white',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  footer: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0',
  },
  footerText: {
    fontSize: '0.85rem',
    color: '#718096',
    textAlign: 'center',
    margin: 0,
  },
};
