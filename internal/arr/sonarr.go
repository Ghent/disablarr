package arr

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

// SeasonStatistics represents episode download counts for a season.
type SeasonStatistics struct {
	EpisodeCount      int `json:"episodeCount"`
	EpisodeFileCount  int `json:"episodeFileCount"`
	TotalEpisodeCount int `json:"totalEpisodeCount"`
}

// Season represents a series season in Sonarr.
type Season struct {
	SeasonNumber int              `json:"seasonNumber"`
	Monitored    bool             `json:"monitored"`
	Statistics   SeasonStatistics `json:"statistics"`
}

// Series represents a Sonarr series.
type Series struct {
	ID        int      `json:"id"`
	Title     string   `json:"title"`
	Status    string   `json:"status"`
	Monitored bool     `json:"monitored"`
	Tags      []int    `json:"tags"`
	Seasons   []Season `json:"seasons"`
}

// GetSeries retrieves all series from Sonarr.
func (c *Client) GetSeries(ctx context.Context) ([]Series, error) {
	b, err := c.doRequest(ctx, http.MethodGet, "/series", nil)
	if err != nil {
		return nil, err
	}

	var series []Series
	err = json.Unmarshal(b, &series)
	return series, err
}

// UpdateSeries updates a given series in Sonarr.
func (c *Client) UpdateSeries(ctx context.Context, s Series) error {
	_, err := c.doRequest(ctx, http.MethodPut, fmt.Sprintf("/series/%d", s.ID), s)
	return err
}
