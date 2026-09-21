SELECT
  `O`.`id` AS `id`,
  `O`.`name` AS `name`,
  `L`.`id` AS `location_id`,
  `L`.`name` AS `location_name`
FROM
  (
    (
      `racktables`.`Object` `O`
      LEFT JOIN `racktables`.`EntityLink` `EL` ON(
        `O`.`id` = `EL`.`child_entity_id`
        AND `EL`.`parent_entity_type` = 'location'
        AND `EL`.`child_entity_type` = 'row'
      )
    )
    LEFT JOIN `racktables`.`Object` `L` ON(
      `EL`.`parent_entity_id` = `L`.`id`
      AND `L`.`objtype_id` = 1562
    )
  )
WHERE
  `O`.`objtype_id` = 1561