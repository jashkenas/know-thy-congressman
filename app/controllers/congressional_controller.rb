class CongressionalController < ApplicationController
  layout nil
  
  def find
    first_name, last_name = params[:name].split('_')
    pol = Politician.find_or_create_by_first_name_and_last_name(first_name, last_name)
    respond_to do |format|
      format.json { render :json => pol.information }
      format.text  { render :text => JSON.parse(pol.information).to_yaml }
    end
  end
  
  
  def bookmarklet
    # Just render.
  end
  
end