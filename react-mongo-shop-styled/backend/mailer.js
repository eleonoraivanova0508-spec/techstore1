const nodemailer = require('nodemailer');

// Настройка транспортера для Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'eleonoraivanova0508@gmail.com',       // твоя корпоративная почта
        pass: 'gtok xmln ptzz xgtb'      // сгенерированный App Password в Gmail
    }
});

/**
 * Функция отправки email
 * @param {string} to - Email получателя (покупателя)
 * @param {string} subject - Тема письма
 * @param {string} html - HTML содержимое письма
 */
async function sendEmail(to, subject, html) {
    try {
        await transporter.sendMail({
            from: '"TechStore" <твояпочта@gmail.com>',  // От кого
            to,                                         // Кому — покупатель
            cc: 'eleonoraivanova0508@gmail.com',                 // Копия на корпоративную почту
            subject,
            html
        });
        console.log(`✅ Email отправлен на ${to}`);
    } catch (error) {
        console.error('❌ Ошибка отправки email:', error);
        throw error;
    }
}

module.exports = sendEmail;
