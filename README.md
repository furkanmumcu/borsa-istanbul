# Borsa-Istanbul

The aim of this project is to check Borsa Istanbul for newcomer technology companies, and notify users.

## Project Architecture and Workflow:
The project architectural diagram, and the explanation of workflow through components can be found below.

![alt text](/docs/arch_diagram.png)

### AWS CloudWatch & AWS Lambda:

Lambda funtion is a simple script which sends request to `/checkBorsa` endpoint of our back-end server. It is triggered by CloudWatch two times in a day.

### Back-end:

Back-end server is the most important part of the project. Its aim is to check Borsa Istanbul for a new company and let users know whether there is a new company or not. It is powered by node.js, used packages and their purpose for the project are as follows;

**axios:** for retrieving the web-page which contains company index of Borsa Istanbul.

**cheerio:** for injecting and using jquery on back-end. 

**express:** for establishing Restful API.

**firebase-admin:** for interacting wiht Firebase Cloud Messaging.

### FCM & Mobile App:

When back-end checks Borsa Istanbul, it notifies Mobile App clients through Firebase Cloud Messaging.
