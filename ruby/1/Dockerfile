# Dockerfile
FROM ruby:2.7.4

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy Gemfile and Gemfile.lock to the container
COPY Gemfile Gemfile.lock ./

# Install bundler
RUN gem install bundler

# Set the bundler version
ENV BUNDLER_VERSION 2.2.28

# Install dependencies
RUN bundle install

# Copy the local code to the container
COPY . .

# Command to run your application
CMD ["ruby", "app.rb"]
