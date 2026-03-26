package arr

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Client is a generic API client for *arr applications
type Client struct {
	baseURL string
	apiKey  string
	http    *http.Client
}

// NewClient returns a new Arr API client
func NewClient(url, apiKey string) *Client {
	// Ensure no trailing slash
	if len(url) > 0 && url[len(url)-1] == '/' {
		url = url[:len(url)-1]
	}

	return &Client{
		baseURL: url,
		apiKey:  apiKey,
		http: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// doRequest performs an HTTP request against the API
func (c *Client) doRequest(ctx context.Context, method, endpoint string, body interface{}) ([]byte, error) {
	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
		bodyReader = bytes.NewReader(b)
	}

	url := fmt.Sprintf("%s/api/v3%s", c.baseURL, endpoint)
	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("X-Api-Key", c.apiKey)
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("API returned non-success status: %s - %s", resp.Status, string(respBody))
	}

	return respBody, nil
}

// Tag represents an Arr tag
type Tag struct {
	ID    int    `json:"id,omitempty"`
	Label string `json:"label"`
}

// GetTags retrieves all tags
func (c *Client) GetTags(ctx context.Context) ([]Tag, error) {
	b, err := c.doRequest(ctx, http.MethodGet, "/tag", nil)
	if err != nil {
		return nil, err
	}

	var tags []Tag
	err = json.Unmarshal(b, &tags)
	return tags, err
}

// CreateTag creates a new tag
func (c *Client) CreateTag(ctx context.Context, label string) (*Tag, error) {
	payload := Tag{Label: strings.ToLower(label)}
	b, err := c.doRequest(ctx, http.MethodPost, "/tag", payload)
	if err != nil {
		return nil, err
	}

	var tag Tag
	err = json.Unmarshal(b, &tag)
	return &tag, err
}

// EnsureTag ensures a tag exists and returns its ID
func (c *Client) EnsureTag(ctx context.Context, label string) (int, error) {
	label = strings.ToLower(label)
	tags, err := c.GetTags(ctx)
	if err != nil {
		return 0, err
	}

	for _, t := range tags {
		if strings.ToLower(t.Label) == label {
			return t.ID, nil
		}
	}

	newTag, err := c.CreateTag(ctx, label)
	if err != nil {
		return 0, err
	}
	return newTag.ID, nil
}
