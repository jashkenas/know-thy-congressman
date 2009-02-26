module Services

  module CapitolWords
    extend Base

    URL = 'www.capitolwords.org/api/lawmaker'

    # Dig up the top 5 words in speeches by the politician over the course of the
    # last year.
    def self.search(bioguide_id)
      safe_request('capitol words') do
        # TODO remove this when the API comes back on up.
        return {}
        now, past = Time.now, Time.now - 1.year.seconds.to_i
        url = [URL, bioguide_id, past.year, past.month, past.day, 
          now.year, now.month, now.day, 'top5.json'].join('/')
        {'capitol_words' => get_json(url)}
      end
    end

  end

end