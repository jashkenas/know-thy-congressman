class CongressionalController < ApplicationController
  
  def find
    first_name, last_name = params[:name].split('_')
    pol = Politician.find_or_create_by_first_name_and_last_name(first_name, last_name)
    render :text => pol.information
  end
  
end