class DataFetcher {
    async fetchJSON(path) {
        try {
            const response = await fetch(path)
            if (!response.ok) throw new Error(`Error due to ${response.status}`)
            return await response.json()
        } catch (error) {
            throw error
        }
    }
}