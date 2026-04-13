package arr

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

// Movie represents a Radarr movie.
type Movie struct {
	ID               int        `json:"id"`
	Title            string     `json:"title"`
	Monitored        bool       `json:"monitored"`
	Status           string     `json:"status"` // expected "released" or "announced" etc
	HasFile          bool       `json:"hasFile"`
	MovieFile        *MovieFile `json:"movieFile,omitempty"`
	Tags             []int      `json:"tags"`
	QualityProfileId int        `json:"qualityProfileId"`
}

// MovieFile contains the details for a downloaded movie file.
type MovieFile struct {
	Quality struct {
		Quality struct {
			ID int `json:"id"`
		} `json:"quality"`
	} `json:"quality"`
	CustomFormats []struct {
		ID int `json:"id"`
	} `json:"customFormats"`
}

// GetMovies retrieves all movies from Radarr.
func (c *Client) GetMovies(ctx context.Context) ([]Movie, error) {
	b, err := c.doRequest(ctx, http.MethodGet, "/movie", nil)
	if err != nil {
		return nil, err
	}

	var movies []Movie
	err = json.Unmarshal(b, &movies)
	return movies, err
}

// UpdateMovie updates a given movie in Radarr.
func (c *Client) UpdateMovie(ctx context.Context, m Movie) error {
	_, err := c.doRequest(ctx, http.MethodPut, fmt.Sprintf("/movie/%d", m.ID), m)
	return err
}

// QualityProfile defines cutoffs for quality matching.
type QualityProfile struct {
	ID             int  `json:"id"`
	Cutoff         int  `json:"cutoff"`
	UpgradeAllowed bool `json:"upgradeAllowed"`
}

// GetQualityProfiles fetches quality profiles to check if a cutoff has been met.
func (c *Client) GetQualityProfiles(ctx context.Context) ([]QualityProfile, error) {
	b, err := c.doRequest(ctx, http.MethodGet, "/qualityprofile", nil)
	if err != nil {
		return nil, err
	}

	var profiles []QualityProfile
	err = json.Unmarshal(b, &profiles)
	return profiles, err
}
