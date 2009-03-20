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
      puts "starting: #{title}"
      result = {}
      return result if opts.has_key?(:ensure) && !opts[:ensure]
      begin
        result = yield
        puts "done with: #{title}"
      rescue RestClient::Exception => e
        result = {}
        puts "error for: #{title} ... #{e}"
      rescue Exception => e
        puts e.message
        puts e.backtrace
        raise e
      end
      result
    end

  end

end 