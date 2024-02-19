<script lang="ts">
	export let width = 24;
	export let height = 24;
	export let color = "currentColor";
</script>

<svg
	{width}
	{height}
	viewBox="0 0 24 24"
	fill="none"
	class="text-white dark:text-black">
	<path
		d="M7 11L12 6L17 11M12 18V7"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round">
	</path>
</svg>
