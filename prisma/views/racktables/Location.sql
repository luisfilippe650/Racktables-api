SELECT
  `O`.`id` AS `id`,
  `O`.`name` AS `name`,
  `O`.`has_problems` AS `has_problems`,
  `O`.`comment` AS `comment`,
  `P`.`id` AS `parent_id`,
  `P`.`name` AS `parent_name`
FROM
  (
    `racktables`.`Object` `O`
    LEFT JOIN (
      `racktables`.`Object` `P`
      JOIN `racktables`.`EntityLink` `EL` ON(
        `EL`.`parent_entity_id` = `P`.`id`
        AND `P`.`objtype_id` = 1562
        AND `EL`.`parent_entity_type` = 'location'
        AND `EL`.`child_entity_type` = 'location'
      )
    ) ON(`EL`.`child_entity_id` = `O`.`id`)
  )
WHERE
  `O`.`objtype_id` = 1562