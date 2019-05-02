const { updateStrDimensions, autoGenLabel } = require('../lib/helpers')

describe("Helper functions", () => {
  describe("updateStrDimensions", () => {
    test("Updates BT name's dimensions", () => {
      const updatedStr = updateStrDimensions('bt-ER-300x250', 123, 4567)
      expect(updatedStr).toBe('bt-ER-123x4567')
    })

    test("Updates BT name with suffix's dimensions", () => {
      const updatedStr = updateStrDimensions('bt-ER-300x250-suffix-name', 123, 4567)
      expect(updatedStr).toBe('bt-ER-123x4567-suffix-name')
    })
  })

  describe("autoGenLabel", () => {
    test("Formats label from suffix", () => {
      const label = autoGenLabel("side-by-side")
      expect(label).toBe("Side By Side")
    })
  })
})
