module Services

  module NewYorkTimes
    extend Base

    TAGS     = 'api.nytimes.com/svc/timestags/suggest?filter=(Per)'
    ARTICLES = 'api.nytimes.com/svc/search/v1/article?fields=title,url,body,date'

    # Dig up the Person Facet from the Gray Lady...
    # She's not so hot at name matching, so we just look for the last name,
    # and perform the matching ourselves.
    def self.search_tags(data, first_name, last_name)
      safe_request('times tags') do
        url = "#{TAGS}&api-key=#{SECRETS['times_tags']}&query=#{last_name}"
        candidates = get_json(url)['results']
        matcher = /(#{first_name}|#{data['search_first_name']})/i
        result = candidates.detect {|c| c.match(matcher) }
        facet = result ? result.sub(/\s*\(Per\)\Z/, '').upcase : nil
        {'person_facet' => facet}
      end
    end

    # Dig up a list of articles from the Gray Lady...
    def self.search_articles(facet)
      safe_request('times articles', :ensure => facet) do
        url = "#{ARTICLES}&api-key=#{SECRETS['times_articles']}&query=per_facet:[#{facet}]"
        results = get_json(url)['results']
        {'nytimes_articles' => results}
      end
    end

  end

end
