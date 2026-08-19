import nodemailer, { Transporter } from 'nodemailer';

class EtherealService {
  private transporter: Transporter | null = null;
  private testAccount: nodemailer.TestAccount | null = null;

  async init() {
    try {
      this.testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: this.testAccount.user,
          pass: this.testAccount.pass,
        },
      });

      console.log('✅ Ethereal Email SMTP initialized');
      console.log(`   User: ${this.testAccount.user}`);
      console.log(`   Pass: ${this.testAccount.pass}`);
    } catch (error) {
      console.error('❌ Failed to initialize Ethereal SMTP account:', error);
      throw error;
    }
  }

  async sendMail(opts: { from: string; to: string; subject: string; html: string }) {
    if (!this.transporter) {
      await this.init();
    }

    if (!this.transporter) {
      throw new Error('Ethereal Transporter uninitialized');
    }

    const info = await this.transporter.sendMail({
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.html.replace(/<[^>]*>?/gm, ''), // fallback plain text
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    return {
      messageId: info.messageId,
      previewUrl: previewUrl || undefined,
    };
  }

  getTestAccount() {
    return this.testAccount;
  }
}

export const etherealService = new EtherealService();
