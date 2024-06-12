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

These instructions will help you get a copy of the project up and running on your local machine

### Pre-requisites

-   Install the latest version of Docker, Docker-compose on your system
-   Working postgres instance
-   SMTP credentials (Ex: from mailgun)

### Installation

Set ADMIN_EMAIL and ADMIN_SLUG in deploy/docker-compose.dev.yml. These are the only mandatory fields. Your database will be automatically configured on the first setup. Details of other variables in the docker-compose file:

| Variable Name            | Description                                                                                                         |
|--------------------------|---------------------------------------------------------------------------------------------------------------------|
| TASKS_DATABASE_URL       | Connection URL to your PG DB (For development, the URL is already configured)                                                                                |
| ADMIN_EMAIL              | Your email address (REQUIRED)                                                                                                  |
| ADMIN_SLUG               | Unique slug (REQUIRED)                                                                                                         |
| ADMIN_OTP                | (OPTIONAL) Set a unique 6 digit code, if you want the writer to be behind OTP login. OTP login turned off by default |
| SECRET                   | Unique secret (change the default secret)                                                                                                       |
| SMTP_HOST                | SMTP HOST (OPTIONAL, used to email OTPs for login)                                                   |
| SMTP_PORT                | OPTIONAL                                                                                                                  |
| SMTP_USER                | OPTIONAL                                                                                                                    |
| SMTP_PASS                | OPTIONAL                                                                                                                    |
| SMTP_FROM                | OPTIONAL                                                                                                                    |
| S3_ENDPOINT              | (OPTIONAL) Set this if you need image uploads to work in editor                                                                                                          |
| REACT_APP_S3_ENDPOINT    | OPTIONAL                                                                                                                    |
| S3_BUCKET                | OPTIONAL                                                                                                                    |
| S3_KEY                   | OPTIONAL                                                                                                                    |
| S3_SECRET                | OPTIONAL                                                                                                                   |

### Development

1. Execute the following commands from the deploy folder:
    ```
    docker-compose -f docker-compose.dev.yml up
    ```
2. Visit localhost:9000 to login and start writing
3. If you set your slug and publish any articles, you can view them at localhost:9222?domain=<admin slug>

## Community

-   [Twitter](https://twitter.com/btw_hq): Product updates & memes.
-   [Discord](https://discord.com/invite/vbDysPXJuF): If you have questions or just want to hang out, come & say hi!

## Coming next

-   Simplified development setup
-   Sample cloud deployment setup
-   Sample custom domain setup instructions
-   Feature roadmap
-   Documentation
-   Contributing guidelines

## License

See the [LICENSE](https://github.com/btw-so/btw/blob/main/LICENSE) file for details.
