# BTW (By The Way)

The cloud hosted version of this project is at [https://app.btw.so](https://app.btw.so)

Sample of a blog that is published using btw:

-   [https://www.siddg.com](https://www.siddg.com)

## Table of Contents

-   [Getting Started](#getting-started)
    -   [Prerequisites](#prerequisites)
    -   [Installation](#installation)
    -   [Running](#running)
-   [Coming next](#coming-next)
-   [License](#license)

## Getting Started

These instructions will help you get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   Install latest Docker, Docker-compose in your system
-   Working postgres instance
-   SMTP credentials (Ex: from mailgun)

### Installation

Provide step-by-step instructions on how to set up the project on a local machine:

1. Setup your database using btw.sql file
2. Replace the variables in deploy/docker-compose.dev.yml

-   TASKS_DATABASE_URL: Set the connection url to your PG DB
-   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM: SMTP access creds (Used to email OTPs for login)
-   S3_ENDPOINT, REACT_APP_S3_ENDPOINT, S3_BUCKET, S3_KEY, S3_SECRET: (OPTIONAL) Set this if you need image uploads to work in editor
-   ADMIN_EMAIL: Your email address
-   SECRET: Unique secret

### Running

Execute following commands from the deploy folder:

`docker-compose -f docker-compose.dev.yml up`

Visit

-   localhost:9000 to login and start writing
-   If you set your slug and publish any articles, you can visit localhost:9222?domain=<slug>

## Coming next

-   Simplified development setup
-   Sample cloud deployment setup
-   Sample custom domain setup instructions
-   Plan for v0 and v1
-   Documentation
-   Contributing guidelines
-   Acknowledgements

## License

This project is licensed under the [LICENSE NAME] License - see the LICENSE.md file for details.
