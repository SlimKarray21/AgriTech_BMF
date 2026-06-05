package com.pistoncontrol.application.service

import jakarta.mail.*
import jakarta.mail.internet.InternetAddress
import jakarta.mail.internet.MimeMessage
import mu.KotlinLogging
import java.util.Properties

private val logger = KotlinLogging.logger {}

class EmailService(
    private val smtpHost: String,
    private val smtpPort: Int,
    private val smtpUsername: String,
    private val smtpPassword: String,
    private val fromAddress: String,
    private val starttls: Boolean = true
) {
    private val session: Session by lazy {
        val useAuth = smtpUsername.isNotBlank()
        val props = Properties().apply {
            put("mail.smtp.host", smtpHost)
            put("mail.smtp.port", smtpPort.toString())
            put("mail.smtp.auth", useAuth.toString())
            put("mail.smtp.starttls.enable", if (useAuth) starttls.toString() else "false")
            put("mail.smtp.connectiontimeout", "10000")
            put("mail.smtp.timeout", "10000")
            put("mail.smtp.writetimeout", "10000")
        }

        if (useAuth) {
            Session.getInstance(props, object : Authenticator() {
                override fun getPasswordAuthentication(): PasswordAuthentication {
                    return PasswordAuthentication(smtpUsername, smtpPassword)
                }
            })
        } else {
            Session.getInstance(props)
        }
    }

    fun sendVerificationCode(toEmail: String, code: String, firstName: String?, expiresInMinutes: Long) {
        val displayName = firstName ?: "there"

        val htmlBody = """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin:0;padding:0;background:#f3f7f4;font-family:Arial,sans-serif;color:#1f2937;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
                      <tr>
                        <td style="background:linear-gradient(135deg,#1f7a42,#2ea15f);padding:24px;text-align:center;color:#ffffff;">
                          <div style="font-size:22px;font-weight:700;letter-spacing:0.4px;">AgriTech</div>
                          <div style="font-size:13px;opacity:0.9;margin-top:6px;">Bienvenue sur votre plateforme agricole intelligente</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:24px;">
                          <p style="margin:0 0 12px 0;font-size:15px;">Bonjour $displayName,</p>
                          <p style="margin:0 0 18px 0;font-size:15px;line-height:1.5;">
                            Merci pour votre inscription. Utilisez ce code OTP pour activer votre compte AgriTech:
                          </p>
                          <div style="background:#f0f9f2;border:1px dashed #2ea15f;border-radius:12px;padding:18px;text-align:center;">
                            <span style="font-size:34px;font-weight:700;letter-spacing:10px;color:#1f7a42;">$code</span>
                          </div>
                          <p style="margin:18px 0 0 0;font-size:14px;line-height:1.5;">
                            Ce code expire dans <strong>$expiresInMinutes minutes</strong>.
                          </p>
                          <p style="margin:10px 0 0 0;font-size:14px;line-height:1.5;color:#4b5563;">
                            Si vous n'etes pas a l'origine de cette demande, ignorez simplement cet email.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;text-align:center;">
                          AgriTech - Verification email automatique
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
        """.trimIndent()

        val message = MimeMessage(session).apply {
            setFrom(InternetAddress(fromAddress, "AgriTech"))
            setRecipient(Message.RecipientType.TO, InternetAddress(toEmail))
            subject = "Votre code de verification AgriTech: $code"
            setContent(htmlBody, "text/html; charset=UTF-8")
        }

        Transport.send(message)
        logger.info { "Verification email sent to $toEmail" }
    }
}
