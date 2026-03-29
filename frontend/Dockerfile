FROM node:22-alpine

# create a directory for the app in the container
WORKDIR /frontend

# copy all files from curr folder to container
COPY . /frontend/

RUN npm install

# default port is 3000, but we can change it in the .env file
EXPOSE 3000

CMD [ "npm", "run", "dev" ]
