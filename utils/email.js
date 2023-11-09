const nodemailer = require('nodemailer');
const nodemailerMandrillTransport = require('nodemailer-mandrill-transport');
const mandrillTransport = require('nodemailer-mandrill-transport');
const pug = require('pug');
//const htmlToText = require('html-to-text');

module.exports = class Email{
  constructor(user, url)
  {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Surabhi Waingankar <${process.env.EMAIL_FROM}>`;
  }

  newTransport(){
    if(process.env.NODE_ENV==='production')
    {
        //Mandrill transporter create
        // return nodemailer.createTransport(mandrillTransport({
        //   apiKey: process.env.API_KEY_MANDRILL
        // }))
    }

    // else if env is dev 
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    }); // returns a transporter
  }

  async send(template, subject){ //pass template for pug
    // send the actual email
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject
    });

    //2) define the email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: subject,
      html: html, // for pug
      //text: htmlToText.fromString(html)
      }

      //3) Create a transport and send email
      await this.newTransport().sendMail(mailOptions)
  }

  async sendWelcome()
  {
    await this.send('welcome', 'Welcome to the Natours Family!');
  }

  async sendPasswordReset()
  {
    await this.send('passwordReset', 'Your password reset token (valid for only 10 mins)');
  }
}

// return nodemailer.createTransport({
//   host: process.env.HOST_MANDRILL,
//   port: process.env.PORT_MANDRILL,
//   auth: {
//     user: process.env.USERNAME_MANDRILL,
//     pass: process.env.API_KEY_MANDRILL
//   }})