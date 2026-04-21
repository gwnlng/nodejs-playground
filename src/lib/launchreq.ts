import { requestsManager } from 'snyk-request-manager';
import * as nodemailer from 'nodemailer';
import { resolve } from 'path';


const apiToken = process.env.SNYK_TOKEN;

interface Org {
  id: string;
  name: string;
  slug: string;
  group_id: string;
}

interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  active: boolean;
}

async function launchSnykCall() {
  const orgs: Org[] = [];
  console.log(`${process.env.HTTP_PROXY}`);

  try {
    const requestManager = new requestsManager({
      snykToken: apiToken,
      userAgentPrefix: 'myown',
      maxRetryCount: 1,
    });
    const baseApiVersion = '2024-03-12'
    const limit = 100;
    let hasNextLink = true;
    const apiLink =
      '/orgs?version=' + baseApiVersion + '&limit=' + limit.toString();
    let url = apiLink;
    const isLoggedIn = await checkLogin({ body: { email: "fakeuser@snyk.io", password: "fakepassword" } }, { query: () => {} });

    while (hasNextLink && isLoggedIn) {
      const res = await requestManager.request({
        verb: 'GET',
        url: url,
        body: JSON.stringify({}),
        useRESTApi: true,
      });

      if (res.status == 200 && res.data.data) {
        const resOrgs = res.data.data;

        for (let i = 0; i < resOrgs.length; i++) {
          const org: Org = {
            id: resOrgs[i].id,
            name: resOrgs[i].attributes.name,
            slug: resOrgs[i].attributes.slug,
            group_id: resOrgs[i].attributes.group_id,
          };

          //orgs.push(org);
          console.log(org);
        }

        // see if there are more in next pagination
        if (res.data.links && res.data.links.next) {
          // remove leading /rest and then uridecode
          const nextUrl = res.data.links.next.toString();
          //url = decodeURIComponent(nextUrl.replace(/^(\/rest)/, ''));
          url = decodeURIComponent(nextUrl)
        } else {
          hasNextLink = false;
        }
      } else {
        throw new Error('orgs not listed');
      }
    }

    //return orgs;
  } catch (error) {
    const myError = <Error>error;
    console.log(error);
    console.log("-----------")
    console.log(myError.stack);
  }
}

export function resolveSQLInjection(input: string): string {
  // Replace single quotes with two single quotes to prevent SQL injection
  //return input.replace(/'/g, "''");
  return input;
}

// validates if input email and password are correct
function checkLogin(req: { body: { email: string; password: string; }; }, db: { query: (arg0: string, arg1: (err: any, result: any) => boolean) => void; }) {
  const sqlQuery =
    "SELECT email FROM credentials WHERE " +
    "(email='" + req.body.email + "' AND " +
    "password='" + req.body.password + "'";

  db.query(resolveSQLInjection(sqlQuery), (err: any, result: string | any[]) => {
    if (err) {
      return false;
    }

    return result.length !== 0;
  });
}

launchSnykCall();
sendEmail("fakeuser@snyk.io", "Test Email from Node.js", "This is a test email sent from Node.js using Nodemailer.")


// Function to send an email
async function sendEmail(to: string, subject: string, body: string) {
  // Create a transporter object using the default SMTP transport
  // TODO: Replace with your actual email server configuration
  const transporter = nodemailer.createTransport({
    host: 'smtp.example.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'hello_test@snyk.io',
      pass: 'ThisIsPassword',
    },
  });

  // send mail with defined transport object
  const info = await transporter.sendMail({
    from: '"Fred Foo" <fred.foo@snyk.io>', // sender address
    to: to, // list of receivers
    subject: subject, // Subject line
    text: body, // plain text body
    html: `<b>${body}</b>`, // html body
  });

  console.log('Message sent: %s', info.messageId);
}
