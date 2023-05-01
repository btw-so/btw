![github-cover](https://user-images.githubusercontent.com/70569022/233320406-da81d842-c0d9-4d63-938e-fe521203e4e0.png)

---

# btw

[btw](https://btw.so) is an open source personal website builder.

You can [sign up](https://btw.so) and use btw without installing anything. You can also use the open source version to self-host.

![btw-editor-screenshot](https://user-images.githubusercontent.com/70569022/233320021-e05c995f-4e4e-48a9-83de-f578d3662df1.png)

### Demo blogs published using btw:

-   [deeptichopra.com](https://www.deeptichopra.com/about)
-   [siddg.com](https://www.siddg.com/about)

## Table of contents

-   [Getting Started](#getting-started)
    -   [Pre-requisites](#pre-requisites)
    -   [Installation](#installation)
    -   [Development](#development)
-   [Community](#community)
-   [Coming next](#coming-next)
-   [License](#license)

## Getting started

These instructions will help you get a copy of the project up and running on your local machine.

### Pre-requisites

-   Install latest Docker, Docker-compose in your system
-   Working postgres instance
-   SMTP credentials (Ex: from mailgun)

### Installation

1. Setup your database using btw.sql file
2. Replace the variables in deploy/docker-compose.dev.yml

-   TASKS_DATABASE_URL: Set the connection url to your PG DB
-   ADMIN_EMAIL: Your email address
-   ADMIN_SLUG: <unique slug>
-   ADMIN_OTP: (OPTIONAL) Set a unique 6 digit code, if you want the writer to be behind OTP login. OTP login turned off by default.
-   SECRET: Unique secret
-   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM: SMTP access creds (OPTIONAL. Used to email OTPs for login)
-   S3_ENDPOINT, REACT_APP_S3_ENDPOINT, S3_BUCKET, S3_KEY, S3_SECRET: (OPTIONAL) Set this if you need image uploads to work in editor

### Development

1. Execute following commands from the deploy folder:
    ```
    docker-compose -f docker-compose.dev.yml up
    ```
2. Visit localhost:9000 to login and start writing
3. If you set your slug and publish any articles, you can view them at localhost:9222?domain=<admin slug>

## Community

-   [Twitter](https://twitter.com/btw_hq): Product updates & memes.
-   [Discord](https://discord.gg/2t5wG7EDb3): If you have questions or just want to hang out, come & say hi!

## Coming next

-   Simplified development setup
-   Sample cloud deployment setup
-   Sample custom domain setup instructions
-   Feature roadmap
-   Documentation
-   Contributing guidelines

## License

See the [LICENSE](https://github.com/btw-so/btw/blob/main/LICENSE) file for details.
