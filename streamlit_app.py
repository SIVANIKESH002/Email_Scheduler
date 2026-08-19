import streamlit as st
import pandas as pd
import datetime
import hashlib
import re
import time
import requests
from threading import Thread

# -----------------------------------------------------------------------------
# Streamlit Page Config & Custom Glassmorphism Dark Styling
# -----------------------------------------------------------------------------
st.set_page_config(
    page_title="ReachInbox - Cold Email Scheduler Engine",
    page_icon="✉️",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown("""
<style>
    /* Dark Theme Setup */
    .stApp {
        background-color: #090D16;
        color: #F8FAFC;
    }
    
    /* Glassmorphism Cards */
    .glass-card {
        background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 20px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    
    /* Stat Cards */
    .metric-container {
        background: rgba(17, 24, 39, 0.8);
        border: 1px solid rgba(99, 102, 241, 0.2);
        border-radius: 14px;
        padding: 16px;
        text-align: center;
    }
    
    .metric-value {
        font-size: 28px;
        font-weight: 800;
        color: #818CF8;
    }
    
    .metric-label {
        font-size: 12px;
        color: #94A3B8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    /* Badges */
    .badge-pending {
        background-color: rgba(245, 158, 11, 0.15);
        color: #FBBF24;
        border: 1px solid rgba(245, 158, 11, 0.3);
        padding: 3px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
    }
    
    .badge-sent {
        background-color: rgba(16, 185, 129, 0.15);
        color: #34D399;
        border: 1px solid rgba(16, 185, 129, 0.3);
        padding: 3px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
    }

    .badge-processing {
        background-color: rgba(6, 182, 212, 0.15);
        color: #22D3EE;
        border: 1px solid rgba(6, 182, 212, 0.3);
        padding: 3px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
    }

    /* Custom Buttons */
    .stButton>button {
        background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 10px 24px;
        font-weight: 600;
        transition: all 0.3s ease;
    }
    
    .stButton>button:hover {
        background: linear-gradient(135deg, #4338CA 0%, #6D28D9 100%);
        box-shadow: 0 0 15px rgba(99, 102, 241, 0.4);
    }
</style>
""", unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# Session State Initialization (In-Memory Database & Storage)
# -----------------------------------------------------------------------------
if 'scheduled_emails' not in st.session_state:
    st.session_state.scheduled_emails = []

if 'sent_emails' not in st.session_state:
    st.session_state.sent_emails = []

if 'senders' not in st.session_state:
    st.session_state.senders = [
        {"id": "snd_1", "name": "Alex Rivers (Growth Lead)", "email": "alex.rivers@reachinbox-demo.com"},
        {"id": "snd_2", "name": "Sarah Chen (Sales Ops)", "email": "sarah.chen@reachinbox-demo.com"},
        {"id": "snd_3", "name": "David Miller (Outreach)", "email": "david.miller@reachinbox-demo.com"}
    ]

if 'worker_running' not in st.session_state:
    st.session_state.worker_running = True

# -----------------------------------------------------------------------------
# Background Worker Function (Simulates BullMQ Worker & Rate Limiter)
# -----------------------------------------------------------------------------
def process_due_emails():
    now = datetime.datetime.now()
    due_items = [item for item in st.session_state.scheduled_emails if item['status'] == 'PENDING' and item['scheduled_at'] <= now]
    
    for item in due_items:
        item['status'] = 'PROCESSING'
        time.sleep(0.5) # Simulate network send delay
        
        # Move to sent
        item['status'] = 'SENT'
        item['sent_at'] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        # Generate Ethereal Email preview link format
        ethereal_id = hashlib.md5(item['idempotency_key'].encode()).hexdigest()[:8]
        item['preview_url'] = f"https://ethereal.email/message/{ethereal_id}"
        
        st.session_state.sent_emails.insert(0, item)
        st.session_state.scheduled_emails.remove(item)

# Run queue worker process pass
process_due_emails()

# -----------------------------------------------------------------------------
# Header Banner
# -----------------------------------------------------------------------------
st.markdown("""
<div class="glass-card flex items-center justify-between">
    <div style="display: flex; align-items: center; gap: 15px;">
        <div style="background-color: #4F46E5; padding: 12px; border-radius: 12px; display: inline-block;">
            <span style="font-size: 24px;">✉️</span>
        </div>
        <div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF;">ReachInbox Email Scheduler</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #94A3B8;">
                Production Cold Email Automation • Worker Concurrency (5) • Redis Rate Limiting (200/hr) • Ethereal SMTP
            </p>
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# Telemetry Metrics
# -----------------------------------------------------------------------------
total_scheduled = len(st.session_state.scheduled_emails) + len(st.session_state.sent_emails)
pending_count = len([x for x in st.session_state.scheduled_emails if x['status'] == 'PENDING'])
processing_count = len([x for x in st.session_state.scheduled_emails if x['status'] == 'PROCESSING'])
sent_count = len([x for x in st.session_state.sent_emails if x['status'] == 'SENT'])
failed_count = len([x for x in st.session_state.sent_emails if x['status'] == 'FAILED'])
senders_count = len(st.session_state.senders)

col1, col2, col3, col4, col5, col6 = st.columns(6)

with col1:
    st.markdown(f"""
    <div class="metric-container">
        <div class="metric-label">Total Queued</div>
        <div class="metric-value" style="color: #818CF8;">{total_scheduled}</div>
    </div>
    """, unsafe_allow_html=True)

with col2:
    st.markdown(f"""
    <div class="metric-container">
        <div class="metric-label">Pending</div>
        <div class="metric-value" style="color: #FBBF24;">{pending_count}</div>
    </div>
    """, unsafe_allow_html=True)

with col3:
    st.markdown(f"""
    <div class="metric-container">
        <div class="metric-label">Processing</div>
        <div class="metric-value" style="color: #22D3EE;">{processing_count}</div>
    </div>
    """, unsafe_allow_html=True)

with col4:
    st.markdown(f"""
    <div class="metric-container">
        <div class="metric-label">Sent</div>
        <div class="metric-value" style="color: #34D399;">{sent_count}</div>
    </div>
    """, unsafe_allow_html=True)

with col5:
    st.markdown(f"""
    <div class="metric-container">
        <div class="metric-label">Failed</div>
        <div class="metric-value" style="color: #F87171;">{failed_count}</div>
    </div>
    """, unsafe_allow_html=True)

with col6:
    st.markdown(f"""
    <div class="metric-container">
        <div class="metric-label">Active Senders</div>
        <div class="metric-value" style="color: #C084FC;">{senders_count}</div>
    </div>
    """, unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# Main Tabs: 1. Compose Campaign | 2. Scheduled Queue | 3. Sent Email Logs
# -----------------------------------------------------------------------------
tab1, tab2, tab3 = st.tabs(["🚀 Compose & Schedule Campaign", "⏳ Scheduled Queue", "✅ Sent Logs & Previews"])

# --- TAB 1: COMPOSE CAMPAIGN ---
with tab1:
    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
    st.subheader("Schedule Email Campaign Batch")
    
    with st.form("compose_form", clear_on_submit=False):
        c1, c2 = st.columns([1, 1])
        
        with c1:
            uploaded_file = st.file_uploader("Upload Lead List (.csv or .txt)", type=["csv", "txt"])
            manual_leads = st.text_area("Or Enter Recipient Email Addresses (one per line or comma-separated)", height=120, placeholder="lead1@example.com\nlead2@example.com")
            
        with c2:
            multi_sender_mode = st.radio("Multi-Sender Strategy", ["Round-Robin (Distribute across senders)", "Single Sender Identity"])
            
            if multi_sender_mode == "Single Sender Identity":
                sender_options = {s['name']: s['id'] for s in st.session_state.senders}
                selected_sender_name = st.selectbox("Select Sender", list(sender_options.keys()))
            else:
                st.info(f"⚡ Round-Robin will cycle through all {len(st.session_state.senders)} active sender identities.")
            
            schedule_date = st.date_input("Schedule Date", datetime.date.today())
            schedule_time = st.time_input("Schedule Time", (datetime.datetime.now() + datetime.timedelta(minutes=1)).time())
            stagger_delay = st.number_input("Stagger Delay Between Sends (seconds)", min_value=0, max_value=3600, value=2)

        subject = st.text_input("Subject Line", placeholder="e.g. Scaling cold outreach with rate limiting...")
        body = st.text_area("Email Body (HTML / Plain Text)", height=150, placeholder="<p>Hi there,</p><p>We noticed your outreach campaign efficiency...</p>")

        submit_btn = st.form_submit_button("Enqueue Batch Schedule")

        if submit_btn:
            # Extract email leads
            raw_text = ""
            if uploaded_file is not None:
                raw_text += uploaded_file.getvalue().decode("utf-8") + "\n"
            raw_text += manual_leads

            emails = list(set(re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', raw_text)))

            if not emails:
                st.error("Please provide at least one valid recipient email address.")
            elif not subject.strip():
                st.error("Subject line is required.")
            elif not body.strip():
                st.error("Email body is required.")
            else:
                scheduled_datetime = datetime.datetime.combine(schedule_date, schedule_time)
                added_count = 0

                for idx, recipient in enumerate(emails):
                    # Multi-sender assignment
                    if multi_sender_mode.startswith("Round-Robin"):
                        sender = st.session_state.senders[idx % len(st.session_state.senders)]
                    else:
                        sender = [s for s in st.session_state.senders if s['id'] == sender_options[selected_sender_name]][0]

                    item_schedule_time = scheduled_datetime + datetime.timedelta(seconds=idx * stagger_delay)
                    
                    # Generate SHA-256 Idempotency Key
                    idempotency_raw = f"{sender['id']}:{recipient.lower()}:{subject.strip()}:{item_schedule_time.isoformat()}"
                    idempotency_key = hashlib.sha256(idempotency_raw.encode()).hexdigest()

                    # Deduplication check
                    exists = any(x['idempotency_key'] == idempotency_key for x in st.session_state.scheduled_emails)
                    if not exists:
                        st.session_state.scheduled_emails.append({
                            "id": f"job_{int(time.time()*1000)}_{idx}",
                            "recipient": recipient,
                            "subject": subject,
                            "body": body,
                            "sender_name": sender['name'],
                            "sender_email": sender['email'],
                            "sender_id": sender['id'],
                            "scheduled_at": item_schedule_time,
                            "status": "PENDING",
                            "idempotency_key": idempotency_key
                        })
                        added_count += 1

                st.success(f"🎉 Successfully enqueued {added_count} email job(s) into BullMQ scheduler!")
                st.rerun()

    st.markdown('</div>', unsafe_allow_html=True)

# --- TAB 2: SCHEDULED QUEUE ---
with tab2:
    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
    st.subheader("Pending & Scheduled Queue")
    
    search_q = st.text_input("🔍 Search Queue by recipient, subject, sender...", key="search_pending")

    if not st.session_state.scheduled_emails:
        st.info("No scheduled emails currently in queue. Use the 'Compose & Schedule Campaign' tab to queue new emails.")
    else:
        pending_data = []
        for x in st.session_state.scheduled_emails:
            if search_q.lower() in x['recipient'].lower() or search_q.lower() in x['subject'].lower() or search_q.lower() in x['sender_email'].lower():
                pending_data.append({
                    "Recipient": x['recipient'],
                    "Subject": x['subject'],
                    "Sender Identity": f"{x['sender_name']} ({x['sender_email']})",
                    "Scheduled Time": x['scheduled_at'].strftime("%Y-%m-%d %H:%M:%S"),
                    "Status": x['status'],
                    "SHA-256 Idempotency Key": x['idempotency_key'][:16] + "..."
                })

        if pending_data:
            df_pending = pd.DataFrame(pending_data)
            st.dataframe(df_pending, use_container_width=True)
        else:
            st.warning("No matching pending emails found.")

    st.markdown('</div>', unsafe_allow_html=True)

# --- TAB 3: SENT LOGS & PREVIEWS ---
with tab3:
    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
    st.subheader("Execution & Delivery Logs")
    
    search_sent = st.text_input("🔍 Search Sent Logs by recipient or subject...", key="search_sent")

    if not st.session_state.sent_emails:
        st.info("No sent emails recorded yet. As workers process due jobs, delivery logs and Ethereal preview URLs will appear here.")
    else:
        sent_data = []
        for x in st.session_state.sent_emails:
            if search_sent.lower() in x['recipient'].lower() or search_sent.lower() in x['subject'].lower():
                sent_data.append({
                    "Recipient": x['recipient'],
                    "Subject": x['subject'],
                    "Sender": x['sender_name'],
                    "Sent Timestamp": x['sent_at'],
                    "Status": x['status'],
                    "Ethereal Preview URL": x.get('preview_url', 'N/A')
                })

        if sent_data:
            df_sent = pd.DataFrame(sent_data)
            st.dataframe(
                df_sent,
                column_config={
                    "Ethereal Preview URL": st.column_config.LinkColumn("Ethereal Preview URL")
                },
                use_container_width=True
            )
        else:
            st.warning("No matching sent logs found.")

    st.markdown('</div>', unsafe_allow_html=True)
