module Services

  module Base

    # Use the JSON and RestClient gems to get json from a url
    def get_json(url)
      begin
        JSON.parse(RestClient.get(URI.encode(url)))
      rescue JSON::ParserError => e # Faux-log any failed requests.
        @data['failed_requests'] ||= []
        @data['failed_requests'] <<  url
        {}
      end
    end

    # Ensure that a failed api call doesn't screw up the remainder of our data.
    def safe_request(title, opts={})
      RAILS_DEFAULT_LOGGER.info "starting: #{title}"
      result = {}
      return result if opts.has_key?(:ensure) && !opts[:ensure]
      begin
        result = yield
        RAILS_DEFAULT_LOGGER.info "done with: #{title}"
      rescue RestClient::Exception => e
        result = {}
        RAILS_DEFAULT_LOGGER.info "error for: #{title} ... #{e}"
      end
      result
    end

  end

end 